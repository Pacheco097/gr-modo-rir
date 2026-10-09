import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class TrocarSenhaDto {
  @ApiPropertyOptional({
    description: 'Senha atual — obrigatória quando o próprio usuário troca a senha (ignorada para administrador)',
  })
  @IsOptional()
  @IsString()
  senhaAtual?: string;

  @ApiProperty({ example: 'novaSenhaForte123', minLength: 6 })
  @IsString()
  @MinLength(6)
  novaSenha: string;
}
