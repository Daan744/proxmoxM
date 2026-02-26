import { Role } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaMaxVMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaMaxCoresTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaMaxMemoryMBTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quotaMaxDiskGBTotal?: number;
}
