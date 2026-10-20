import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { nextCommissionStage, previousCommissionStage } from './commission-stages';
import { CommissionService } from './commission.service';

const base = {
  id: 'c1',
  orderId: 'o1',
  orderNumber: 'ORD-1',
  userId: 'u1',
  title: 'Mehr',
  promisedAt: null,
  completedAt: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  events: [],
  appointments: [],
};

function build(stage: string = 'CONSULTATION') {
  const prisma = {
    commission: {
      findUnique: jest.fn().mockResolvedValue({ ...base, stage }),
      findFirst: jest.fn().mockResolvedValue({ ...base, stage }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...base, ...data, stage: 'CONSULTATION' })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...base, stage, ...data })),
    },
    commissionAppointment: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data })),
      findUnique: jest.fn().mockResolvedValue({ id: 'a1' }),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data })),
    },
    order: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'o1',
        number: 'ORD-1',
        userId: 'u1',
        guestName: null,
        guestPhone: null,
        guestEmail: null,
      }),
    },
  };
  const audit = { record: jest.fn() };
  const notifications = { send: jest.fn() };
  const storage = { putImage: jest.fn().mockResolvedValue({ url: 'https://cdn.test/p.webp' }) };
  const service = new CommissionService(prisma as never, audit as never, notifications as never, storage as never);
  return { service, prisma, audit, notifications, storage };
}

describe('commission stages', () => {
  it('runs in a straight line', () => {
    expect(nextCommissionStage('CONSULTATION')).toBe('DESIGN');
    expect(nextCommissionStage('FITTING')).toBeNull();
    expect(previousCommissionStage('CONSULTATION')).toBeNull();
    expect(previousCommissionStage('CORSET')).toBe('DESIGN');
  });
});

describe('CommissionService', () => {
  describe('open', () => {
    it('starts the track at consultation, owned by the order\'s client', async () => {
      const { service, prisma } = build();
      prisma.commission.findUnique.mockResolvedValueOnce(null);
      const created = await service.open('staff1', { orderNumber: ' ORD-1 ', title: ' Mehr ' });
      const data = prisma.commission.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ orderId: 'o1', userId: 'u1', title: 'Mehr' });
      expect(data.events.create).toMatchObject({ stage: 'CONSULTATION', actorId: 'staff1' });
      expect(created.orderNumber).toBe('ORD-1');
    });

    it('refuses an unknown order', async () => {
      const { service, prisma } = build();
      prisma.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.open('s', { orderNumber: 'X', title: 'Mehr' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses a second commission on one order', async () => {
      const { service } = build();
      await expect(service.open('s', { orderNumber: 'ORD-1', title: 'Mehr' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('changeStage', () => {
    it('moves to the next stage, records the event and tells the client', async () => {
      const { service, prisma, notifications } = build('CONSULTATION');
      await service.changeStage('s', 'c1', { stage: 'DESIGN', note: ' Sketch approved ' });
      const data = prisma.commission.update.mock.calls[0][0].data;
      expect(data.stage).toBe('DESIGN');
      expect(data.events.create).toMatchObject({ stage: 'DESIGN', note: 'Sketch approved', actorId: 's' });
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'commission.stage_changed', data: expect.objectContaining({ stage: 'DESIGN' }) }),
      );
    });

    it('stores a photograph and links it to the event', async () => {
      const { service, prisma, storage } = build('DESIGN');
      await service.changeStage('s', 'c1', { stage: 'CORSET' }, { buffer: Buffer.from('x'), originalname: 'a.jpg', mimetype: 'image/jpeg' });
      expect(storage.putImage).toHaveBeenCalled();
      expect(prisma.commission.update.mock.calls[0][0].data.events.create).toMatchObject({
        mediaUrl: 'https://cdn.test/p.webp',
        mediaKind: 'image',
      });
    });

    it('will not skip a stage', async () => {
      const { service } = build('CONSULTATION');
      await expect(service.changeStage('s', 'c1', { stage: 'FLORALS' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('needs a reason to go back, and does not announce a step back', async () => {
      const { service, notifications } = build('CORSET');
      await expect(service.changeStage('s', 'c1', { stage: 'DESIGN' })).rejects.toBeInstanceOf(BadRequestException);
      await service.changeStage('s', 'c1', { stage: 'DESIGN', note: 'Neckline redrawn' });
      expect(notifications.send).not.toHaveBeenCalled();
    });

    it('does nothing when the stage is unchanged', async () => {
      const { service, prisma } = build('CORSET');
      await service.changeStage('s', 'c1', { stage: 'CORSET' });
      expect(prisma.commission.update).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('ends the track only at the final fitting', async () => {
      const early = build('FLORALS');
      await expect(early.service.complete('s', 'c1')).rejects.toBeInstanceOf(BadRequestException);
      const last = build('FITTING');
      await last.service.complete('s', 'c1');
      expect(last.prisma.commission.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('the client', () => {
    it('reads only their own commissions, without who moved a stage', async () => {
      const { service, prisma } = build();
      prisma.commission.findMany.mockResolvedValueOnce([
        {
          ...base,
          stage: 'DESIGN',
          events: [{ id: 'e1', stage: 'DESIGN', note: 'n', mediaUrl: null, mediaKind: null, actorId: 'secret', createdAt: base.createdAt }],
        },
      ]);
      const mine = await service.listMine('u1');
      expect(prisma.commission.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
      expect(JSON.stringify(mine)).not.toContain('secret');
    });

    it('cannot ask for a fitting on someone else\'s gown', async () => {
      const { service, prisma } = build();
      prisma.commission.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.requestAppointment('u2', 'c1', { kind: 'ATELIER', startsAt: '2999-01-01T10:00:00Z' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cannot ask for a fitting in the past', async () => {
      const { service } = build();
      await expect(
        service.requestAppointment('u1', 'c1', { kind: 'HOME', startsAt: '2000-01-01T10:00:00Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('asks for a fitting that starts as a request', async () => {
      const { service, prisma } = build();
      await service.requestAppointment('u1', 'c1', { kind: 'VIDEO', startsAt: '2999-01-01T10:00:00Z', note: ' evening ' });
      expect(prisma.commissionAppointment.create.mock.calls[0][0].data).toMatchObject({
        commissionId: 'c1',
        kind: 'VIDEO',
        note: 'evening',
      });
    });
  });
});
