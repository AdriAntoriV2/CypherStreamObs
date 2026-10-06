import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateStreamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}