import { IsObject, IsString, IsUUID } from 'class-validator';

export class CreateEventDto {
  @IsUUID()
  streamId: string;

  @IsString()
  type: string;

  @IsObject()
  payload: Record<string, unknown>;
}