import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export const COMMISSION_STAGE_VALUES = ['CONSULTATION', 'DESIGN', 'CORSET', 'FLORALS', 'FITTING'] as const;
export const COMMISSION_APPOINTMENT_KINDS = ['ATELIER', 'HOME', 'VIDEO'] as const;
export const COMMISSION_APPOINTMENT_STATUSES = ['REQUESTED', 'CONFIRMED', 'DONE', 'CANCELLED'] as const;

export class OpenCommissionDto {
  @ApiProperty({ description: 'The order the commission was sold on', example: 'ORD-2026-0001' })
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @ApiProperty({ description: 'What is being made, as the client knows it', example: 'Mehr' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ description: 'The date the atelier has promised' })
  @IsOptional()
  @IsDateString()
  promisedAt?: string;
}

export class ChangeCommissionStageDto {
  @ApiProperty({ enum: COMMISSION_STAGE_VALUES })
  @IsIn(COMMISSION_STAGE_VALUES)
  stage!: (typeof COMMISSION_STAGE_VALUES)[number];

  @ApiPropertyOptional({ description: 'Shown to the client; required when sending a gown back a stage' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ description: 'A film already hosted elsewhere' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string;
}

export class RequestAppointmentDto {
  @ApiProperty({ enum: COMMISSION_APPOINTMENT_KINDS })
  @IsIn(COMMISSION_APPOINTMENT_KINDS)
  kind!: (typeof COMMISSION_APPOINTMENT_KINDS)[number];

  @ApiProperty({ description: 'The time asked for; the atelier confirms or moves it' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ enum: COMMISSION_APPOINTMENT_STATUSES })
  @IsOptional()
  @IsIn(COMMISSION_APPOINTMENT_STATUSES)
  status?: (typeof COMMISSION_APPOINTMENT_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
