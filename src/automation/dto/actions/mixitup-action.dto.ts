import {
  IsIn,
  IsString,
} from 'class-validator';

export class MixItUpActionDto {
  @IsIn(['mixitup'])
  type: 'mixitup';

  @IsString()
  command: string;
}