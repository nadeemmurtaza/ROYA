import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class SetMonthlyTargetDto {
  @ApiProperty({ description: 'Minor units, e.g. 100000000 for 1,000,000 of the shop currency' })
  @IsInt()
  @IsPositive()
  targetAmount!: number;
}
