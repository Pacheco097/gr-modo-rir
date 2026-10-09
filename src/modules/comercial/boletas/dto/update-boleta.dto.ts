import { ApiExtraModels } from '@nestjs/swagger';
import { CreateBoletaDto } from './create-boleta.dto';

/**
 * PUT de substituição integral (docx §4: "Padrão REST ... PUT /api/v1/<recurso>/:id").
 * Replica `salvarBoleta()` do HTML: cada edição reenvia o formulário inteiro.
 * Só é aceito quando a boleta está em RASCUNHO (ver BoletasService.atualizar).
 */
@ApiExtraModels(CreateBoletaDto)
export class UpdateBoletaDto extends CreateBoletaDto {}
