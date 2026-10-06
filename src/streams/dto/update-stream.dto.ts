import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateStreamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}