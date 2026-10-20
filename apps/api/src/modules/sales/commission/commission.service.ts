import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../core/audit/audit.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import type { CommissionStage, Prisma } from '../../../core/prisma/client';
import { StorageService } from '../../../core/storage/storage.service';
import { nextCommissionStage, previousCommissionStage } from './commission-stages';
import type {
  ChangeCommissionStageDto,
  OpenCommissionDto,
  RequestAppointmentDto,
  UpdateAppointmentDto,
} from './dto/commission.dto';

const include = {
  events: { orderBy: { createdAt: 'asc' } },
  appointments: { orderBy: { startsAt: 'asc' } },
} satisfies Prisma.CommissionInclude;

type CommissionRow = Prisma.CommissionGetPayload<{ include: typeof include }>;

export interface UploadedMedia {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** What each stage means to the client, rather than to the workshop. */
const STAGE_WORDS: Record<CommissionStage, string> = {
  CONSULTATION: 'in consultation',
  DESIGN: 'being designed',
  CORSET: 'in the corset stage',
  FLORALS: 'having its florals sculpted',
  FITTING: 'ready for its final fitting',
};

/**
 * The commission tracker: where a bespoke gown is on its way from the first
 * conversation to the final fitting.
 *
 * The stages are a straight line and only neighbours are reachable, so the
 * client's track is always a story that makes sense. Every move is appended as
 * an event the client can read (a note, and a photograph if the atelier wished).
 */
@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  // --- The client's own ----------------------------------------------------

  /** The client's commissions, newest first. Who on the team moved a stage is not part of what the client sees. */
  async listMine(userId: string) {
    const rows = await this.prisma.commission.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toClientView);
  }

  async requestAppointment(userId: string, commissionId: string, dto: RequestAppointmentDto) {
    const commission = await this.prisma.commission.findFirst({ where: { id: commissionId, userId } });
    if (!commission) throw new NotFoundException('That commission was not found.');
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) throw new BadRequestException('Choose a time in the future.');
    return this.prisma.commissionAppointment.create({
      data: { commissionId, kind: dto.kind, startsAt, note: dto.note?.trim() || null },
    });
  }

  // --- The atelier ---------------------------------------------------------

  list(query: { stage?: CommissionStage; open?: boolean }) {
    return this.prisma.commission.findMany({
      where: {
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.open ? { completedAt: null } : {}),
      },
      include,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async get(id: string) {
    const commission = await this.prisma.commission.findUnique({ where: { id }, include });
    if (!commission) throw new NotFoundException('That commission no longer exists.');
    return commission;
  }

  /** Starts the track for an order. One commission per order. */
  async open(actorId: string, dto: OpenCommissionDto) {
    const order = await this.prisma.order.findUnique({
      where: { number: dto.orderNumber.trim() },
      select: { id: true, number: true, userId: true },
    });
    if (!order) throw new NotFoundException('There is no order with that number.');
    const existing = await this.prisma.commission.findUnique({ where: { orderId: order.id } });
    if (existing) throw new ConflictException('That order already has a commission.');

    const commission = await this.prisma.commission.create({
      data: {
        orderId: order.id,
        orderNumber: order.number,
        userId: order.userId,
        title: dto.title.trim(),
        promisedAt: dto.promisedAt ? new Date(dto.promisedAt) : null,
        events: { create: { stage: 'CONSULTATION', actorId } },
      },
      include,
    });
    await this.audit.record({
      actorId,
      action: 'commission.opened',
      entity: 'Commission',
      entityId: commission.id,
      data: { orderNumber: order.number },
    });
    return commission;
  }

  async changeStage(actorId: string, id: string, dto: ChangeCommissionStageDto, media?: UploadedMedia) {
    const commission = await this.prisma.commission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('That commission no longer exists.');
    if (commission.stage === dto.stage) return this.get(id);

    const forward = nextCommissionStage(commission.stage);
    const back = previousCommissionStage(commission.stage);
    if (dto.stage !== forward && dto.stage !== back) {
      throw new BadRequestException(
        `A commission at ${commission.stage.toLowerCase()} can only move to ${[forward, back]
          .filter(Boolean)
          .map((stage) => stage!.toLowerCase())
          .join(' or ')}.`,
      );
    }
    const note = dto.note?.trim() || null;
    if (dto.stage === back && !note) throw new BadRequestException('Say why the gown is going back a stage.');

    let mediaUrl = dto.mediaUrl ?? null;
    let mediaKind: string | null = mediaUrl ? 'video' : null;
    if (media) {
      const stored = await this.storage.putImage({
        folder: 'commissions',
        filename: media.originalname,
        contentType: media.mimetype,
        body: media.buffer,
      });
      mediaUrl = stored.url;
      mediaKind = 'image';
    }

    const updated = await this.prisma.commission.update({
      where: { id },
      data: {
        stage: dto.stage,
        // Moving the gown on (or back) reopens a track that had been closed.
        completedAt: null,
        events: { create: { stage: dto.stage, note, mediaUrl, mediaKind, actorId } },
      },
      include,
    });
    await this.audit.record({
      actorId,
      action: 'commission.stage_changed',
      entity: 'Commission',
      entityId: id,
      data: { from: commission.stage, to: dto.stage, note },
    });
    // A step back is the atelier's rework; the client is told about progress only.
    if (dto.stage === forward) await this.tellClient(updated, note);
    return updated;
  }

  /** The final fitting is done: the track ends. */
  async complete(actorId: string, id: string) {
    const commission = await this.get(id);
    if (commission.stage !== 'FITTING') {
      throw new BadRequestException('Only a gown at its final fitting can be completed.');
    }
    const updated = await this.prisma.commission.update({
      where: { id },
      data: { completedAt: new Date() },
      include,
    });
    await this.audit.record({ actorId, action: 'commission.completed', entity: 'Commission', entityId: id });
    return updated;
  }

  async updateAppointment(actorId: string, appointmentId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.commissionAppointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('That appointment no longer exists.');
    const updated = await this.prisma.commissionAppointment.update({
      where: { id: appointmentId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.startsAt ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
    await this.audit.record({
      actorId,
      action: 'commission.appointment_updated',
      entity: 'CommissionAppointment',
      entityId: appointmentId,
      data: { status: dto.status, startsAt: dto.startsAt },
    });
    return updated;
  }

  /** Tells the client their gown has moved on. `send` swallows channel failures, so a message never undoes the move. */
  private async tellClient(commission: CommissionRow, note: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id: commission.orderId },
      select: { number: true, userId: true, guestName: true, guestPhone: true, guestEmail: true },
    });
    if (!order) return;
    const words = STAGE_WORDS[commission.stage];
    await this.notifications.send({
      template: 'commission.stage_changed',
      recipient: {
        name: order.guestName,
        phone: order.guestPhone,
        email: order.guestEmail,
        userId: order.userId,
      },
      subject: `${commission.title}: ${words}`,
      body: `${order.number} — ${commission.title} is ${words}.${note ? ` ${note}` : ''}`,
      data: { stage: commission.stage, reference: order.number, garment: commission.title },
    });
  }
}

function toClientView(row: CommissionRow) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    title: row.title,
    stage: row.stage,
    promisedAt: row.promisedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    events: row.events.map(({ id, stage, note, mediaUrl, mediaKind, createdAt }) => ({
      id,
      stage,
      note,
      mediaUrl,
      mediaKind,
      createdAt,
    })),
    appointments: row.appointments.map(({ id, kind, startsAt, status, note }) => ({ id, kind, startsAt, status, note })),
  };
}
