import { Module } from '@nestjs/common';
import { CommissionAdminController, CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';

@Module({
  controllers: [CommissionController, CommissionAdminController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
