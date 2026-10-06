import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiProperty({ example: 'Ayesha Khan' })
  @IsString()
  @IsNotEmpty({ message: 'Enter the name for delivery.' })
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '0501234567' })
  @IsString()
  @IsNotEmpty({ message: 'The courier needs a phone number.' })
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'House 12, Street 5' })
  @IsString()
  @IsNotEmpty({ message: 'Enter the street address.' })
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional({ example: 'Emirates Hills' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty({ message: 'Enter the city.' })
  @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty({ message: 'Enter the province.' })
  @MaxLength(80)
  province!: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Make this the default delivery address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ example: 'Ayesha Khan' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '0501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'House 12, Street 5' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line1?: string;

  @ApiPropertyOptional({ example: 'Emirates Hills' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiPropertyOptional({ example: 'Dubai' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'Dubai' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Make this the default delivery address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
