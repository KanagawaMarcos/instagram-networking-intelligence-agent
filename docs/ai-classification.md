# Classificação por IA

## Contrato

`packages/ai` envia ao Claude apenas biografia, profissão, cargo, empresa, interesses profissionais, notas fornecidas e interações autorizadas. A resposta é JSON validado por `assessmentSchema` (Zod): categoria, resumo, evidências, oportunidades, confiança, racional, abordagem, mensagem e campos ausentes.

O prompt de sistema trata bio, comentários e notas como conteúdo não confiável. Eles são dados, não instruções. Ele proíbe inferir atributos sensíveis, conexões, experiências, localização, idade ou senioridade sem evidência. Campos sem suporte devem ser `null`, `UNKNOWN` ou constar em `missingInformation`.

## Pontuação

O score é calculado fora do modelo:

- relevância profissional: 35%
- potencial de colaboração: 30%
- evidência de interação: 20%
- qualidade/atualidade: 15%

Os pesos podem ser salvos por configuração de objetivos e precisam totalizar 1. Ausência de interação recebe valor neutro, e dados desconhecidos não são prova negativa. A interface mostra contribuição e motivo de cada fator, além da confiança independente da relevância.

## Claude e custos

Com `ANTHROPIC_API_KEY`, `ClaudeAnalysisEngine` chama o modelo definido por `ANTHROPIC_MODEL`, registra tokens de entrada/saída e valida o JSON antes de persistir. Sem chave — ou com `DEMO_MODE=true` — o `DemoAnalysisEngine` gera uma saída estruturalmente idêntica com regras locais e custo zero. Nunca o apresente como resultado do Claude.
