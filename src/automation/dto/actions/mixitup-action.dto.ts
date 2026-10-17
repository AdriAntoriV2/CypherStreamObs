import { ApiProperty } from '@nestjs/swagger';

export class MixItUpActionDto {
@ApiProperty({ enum: ['mixitup'], example: 'mixitup' })
type: 'mixitup';

@ApiProperty({ example: '!so someviewer' })
command: string;
}