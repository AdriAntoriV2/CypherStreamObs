
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePointPoolEventDto {
  @ApiProperty({
    description: 'Name of the point pool event.',
    example: 'Project SEKAI Challenge',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
