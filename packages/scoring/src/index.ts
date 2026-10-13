import { defaultScoringWeights, type NetworkingGoal, type ProfessionalCategory, type ScoringWeights, scoringWeightsSchema } from "@ina/shared";

export type ScoreInput = {
  category: ProfessionalCategory;
  aiRelevance: number;
  confidence: number;
  opportunities: number;
  interactions: number;
  hasBiography: boolean;
  hasProfessionalFields: number;
  daysSinceEvidence?: number;
  goals: NetworkingGoal[];
};
export type ScoreExplanation = { factor: string; weight: number; rawScore: number; contribution: number; reason: string };
export type RankingResult = { finalScore: number; confidence: number; explanation: ScoreExplanation[] };

const categoryGoalMatch: Partial<Record<ProfessionalCategory, NetworkingGoal>> = {
  FOUNDER: "FOUNDERS", RECRUITER: "RECRUITERS", ENGINEER: "SENIOR_ENGINEERS", TECH_LEADER: "TECH_LEADERS", CREATOR: "TECH_CREATORS", COLLABORATOR: "COLLABORATION"
};

function clamp(value: number) { return Math.min(100, Math.max(0, value)); }

export function calculateRanking(input: ScoreInput, requestedWeights: ScoringWeights = defaultScoringWeights): RankingResult {
  const weights = scoringWeightsSchema.parse(requestedWeights);
  const goalBoost = input.goals.includes(categoryGoalMatch[input.category] ?? "COLLABORATION") ? 10 : 0;
  const relevance = clamp(input.aiRelevance + goalBoost);
  const collaboration = clamp(input.opportunities * 25 + (input.category === "COLLABORATOR" ? 10 : 0));
  // Nenhuma interação é ausência de evidência, não penalidade: parte de 50 neutro.
  const interaction = clamp(50 + Math.min(input.interactions, 5) * 10);
  const recency = input.daysSinceEvidence === undefined ? 50 : clamp(100 - Math.min(input.daysSinceEvidence, 365) / 3.65);
  const quality = clamp((input.hasBiography ? 35 : 0) + Math.min(input.hasProfessionalFields, 3) * 20 + recency * 0.05);
  const factors: Array<[string, number, number, string]> = [
    ["Relevância profissional", weights.professionalRelevance, relevance, goalBoost ? "Categoria alinhada a uma meta configurada." : "Baseada na classificação profissional disponível."],
    ["Potencial de colaboração", weights.collaborationValue, collaboration, "Calculado pela quantidade de oportunidades identificadas."],
    ["Evidência de interação", weights.interactionEvidence, interaction, input.interactions ? `${input.interactions} interação(ões) autorizada(s) registrada(s).` : "Sem interações registradas; usado valor neutro."],
    ["Qualidade e atualidade", weights.informationQuality, quality, "Considera informações disponíveis e data da evidência, sem punir campos desconhecidos."]
  ];
  const explanation = factors.map(([factor, weight, rawScore, reason]) => ({ factor, weight, rawScore, contribution: Math.round(rawScore * weight * 100) / 100, reason }));
  return { finalScore: Math.round(explanation.reduce((total, item) => total + item.contribution, 0)), confidence: input.confidence, explanation };
}
