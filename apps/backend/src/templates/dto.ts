import { TemplateNodeScope } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsEnum(TemplateNodeScope)
  nodeScope!: TemplateNodeScope;

  @IsOptional()
  @IsString()
  sourceNode?: string;

  @IsInt()
  templateVmid!: number;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  defaultBridge?: string;

  @IsOptional()
  @IsInt()
  defaultVlanTag?: number;

  @IsInt()
  @Min(1)
  minCores!: number;

  @IsInt()
  @Min(1)
  maxCores!: number;

  @IsInt()
  @Min(256)
  minMemoryMB!: number;

  @IsInt()
  @Min(256)
  maxMemoryMB!: number;

  @IsInt()
  @Min(1)
  minDiskGB!: number;

  @IsInt()
  @Max(5000)
  maxDiskGB!: number;

  @IsBoolean()
  haEnabledDefault!: boolean;

  @IsOptional()
  @IsString()
  haGroup?: string;

  @IsBoolean()
  allowUserNodeSelect!: boolean;

  @IsBoolean()
  allowHaToggle!: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TemplateNodeScope)
  nodeScope?: TemplateNodeScope;

  @IsOptional()
  @IsString()
  sourceNode?: string;

  @IsOptional()
  @IsInt()
  templateVmid?: number;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  defaultBridge?: string;

  @IsOptional()
  @IsInt()
  defaultVlanTag?: number;

  @IsOptional()
  @IsBoolean()
  haEnabledDefault?: boolean;

  @IsOptional()
  @IsString()
  haGroup?: string;

  @IsOptional()
  @IsBoolean()
  allowUserNodeSelect?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHaToggle?: boolean;
}
