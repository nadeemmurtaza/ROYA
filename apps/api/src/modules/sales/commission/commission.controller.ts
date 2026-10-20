import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../core/auth/auth.constants';
import { AuthenticatedOnly, CurrentUser, RequirePermission } from '../../../core/auth/decorators';
import type { CommissionStage } from '../../../core/prisma/client';
import { CommissionService, type UploadedMedia } from './commission.service';
import {
  ChangeCommissionStageDto,
  OpenCommissionDto,
  RequestAppointmentDto,
  UpdateAppointmentDto,
} from './dto/commission.dto';

@ApiTags('commissions')
@Controller('commissions')
@AuthenticatedOnly()
export class CommissionController {
  constructor(private readonly commissions: CommissionService) {}

  @Get('mine')
  @ApiOperation({ summary: 'My commissions, with their progress track and fittings' })
  mine(@CurrentUser('id') userId: string) {
    return this.commissions.listMine(userId);
  }

  @Post(':id/appointments')
  @ApiOperation({ summary: 'Ask for a fitting; the atelier confirms the time' })
  requestAppointment(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: RequestAppointmentDto) {
    return this.commissions.requestAppointment(userId, id, dto);
  }
}

@ApiTags('commissions')
@Controller('admin/commissions')
export class CommissionAdminController {
  constructor(private readonly commissions: CommissionService) {}

  @Get()
  @RequirePermission('commissions.manage')
  @ApiOperation({ summary: 'Commissions in the atelier, most recently moved first' })
  list(@Query('stage') stage?: CommissionStage, @Query('open') open?: string) {
    return this.commissions.list({ stage, open: open === 'true' });
  }

  @Get(':id')
  @RequirePermission('commissions.manage')
  get(@Param('id') id: string) {
    return this.commissions.get(id);
  }

  @Post()
  @RequirePermission('commissions.manage')
  @ApiOperation({ summary: 'Start the track for an order' })
  open(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenCommissionDto) {
    return this.commissions.open(user.id, dto);
  }

  @Post(':id/stage')
  @ApiConsumes('application/json', 'multipart/form-data')
  @UseInterceptors(FileInterceptor('photo'))
  @RequirePermission('commissions.manage')
  @ApiOperation({ summary: 'Move a gown one stage, optionally with a note and a photograph' })
  changeStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeCommissionStageDto,
    @UploadedFile() photo?: UploadedMedia,
  ) {
    return this.commissions.changeStage(user.id, id, dto, photo);
  }

  @Post(':id/complete')
  @RequirePermission('commissions.manage')
  @ApiOperation({ summary: 'End the track after the final fitting' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commissions.complete(user.id, id);
  }

  @Patch('appointments/:appointmentId')
  @RequirePermission('commissions.manage')
  @ApiOperation({ summary: 'Confirm, move, finish or cancel a fitting' })
  updateAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.commissions.updateAppointment(user.id, appointmentId, dto);
  }
}
