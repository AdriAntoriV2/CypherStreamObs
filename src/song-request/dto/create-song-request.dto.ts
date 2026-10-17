
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSongRequestDto {
  @ApiProperty({
    description: 'YouTube URL or search query',
    example: 'https://www.youtube.com/watch?v=RsmJ--RNgE8',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query!: string;
}
