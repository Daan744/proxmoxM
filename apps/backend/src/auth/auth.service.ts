import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException("Email already in use");
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash }
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const records = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    for (const record of records) {
      if (await argon2.verify(record.tokenHash, refreshToken)) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() }
        });
        return this.issueTokens(record.user.id, record.user.email, record.user.role);
      }
    }

    throw new UnauthorizedException("Invalid refresh token");
  }

  async logout(refreshToken: string | null) {
    if (!refreshToken) {
      return;
    }

    const records = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null }
    });
    for (const record of records) {
      if (await argon2.verify(record.tokenHash, refreshToken)) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() }
        });
        break;
      }
    }
  }

  private async issueTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get("JWT_ACCESS_EXPIRES_IN", "15m")
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
      expiresIn: `${this.config.get("JWT_REFRESH_EXPIRES_IN_DAYS", "7")}d`
    });

    const refreshDays = Number(this.config.get("JWT_REFRESH_EXPIRES_IN_DAYS", "7"));
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role }
    };
  }
}
