import { ApiProperty } from "@nestjs/swagger";
import {
    IsString,
    IsNotEmpty,
    IsOptional,
  } from 'class-validator';
import { IBaseMessage } from "../../model";

  export class MessageDto implements IBaseMessage {
    @ApiProperty({
      description: 'Optional unique identifier',
      example: '73e93a8b-e67a-437b-971f-c6c958d14546',
    })
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    id?: string;
  
    @ApiProperty({
      description: 'Message type',
      example: 'text',
    })
    @IsString()
    @IsNotEmpty()
    type!: string;
  
    @ApiProperty({
      description: 'Connection identifier',
      example: '73e93a8b-e67a-437b-971f-c6c958d14546',
    })
    connectionId!: string;

    
    @ApiProperty({
      description: 'Optional timestamp',
      example: '2024-03-11T14:03:50.607Z',
    })    
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    timestamp?: Date;

    @ApiProperty({
      description: 'Thread identifier (if the message comes as a response from another flow)',
      example: '73e93a8b-e67a-437b-971f-c6c958d14546',
    })    
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    threadId?: string;
  }
  