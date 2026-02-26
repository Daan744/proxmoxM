import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

class CloudInitDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  sshKey?: string;
}

export class CreateVmDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  isoPath?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  requestedNode?: string;

  @IsInt()
  @Min(1)
  @Max(64)
  cores!: number;

  @IsInt()
  @Min(512)
  memoryMB!: number;

  @IsInt()
  @Min(5)
  diskGB!: number;

  @IsOptional()
  @IsString()
  bridge?: string;

  @IsOptional()
  @IsInt()
  vlanTag?: number;

  @IsOptional()
  @IsBoolean()
  haEnabled?: boolean;

  @IsOptional()
  @IsString()
  haGroup?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CloudInitDto)
  cloudInit?: CloudInitDto;
}
