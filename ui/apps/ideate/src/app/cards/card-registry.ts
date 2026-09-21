import { Type } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { ThoughtCardComponent } from './thought-card.component';
import { ConceptCardComponent } from './concept-card.component';
import { UnknownCardComponent } from './unknown-card.component';
import { QuestionCardComponent } from './question-card.component';
import { HypothesisCardComponent } from './hypothesis-card.component';
import { AssumptionCardComponent } from './assumption-card.component';
import { EvidenceCardComponent } from './evidence-card.component';
import { ExperimentCardComponent } from './experiment-card.component';
import { ObservationCardComponent } from './observation-card.component';
import { ClaimCardComponent } from './claim-card.component';
import { CritiqueCardComponent } from './critique-card.component';
import { DecisionCardComponent } from './decision-card.component';
import { EvaluationCardComponent } from './evaluation-card.component';
import { TheoryCardComponent } from './theory-card.component';
import { MisconceptionCardComponent } from './misconception-card.component';
import { ConstraintCardComponent } from './constraint-card.component';
import { CalculationCardComponent } from './calculation-card.component';
import { TargetCardComponent } from './target-card.component';
import { DesignArtifactCardComponent } from './design-artifact-card.component';
import { ArchitectureCardComponent } from './architecture-card.component';
import { ComponentCardComponent } from './component-card.component';

export const CARD_COMPONENTS: Record<string, Type<unknown>> = {
  'thought': ThoughtCardComponent,
  'concept': ConceptCardComponent,
  'unknown': UnknownCardComponent,
  'question': QuestionCardComponent,
  'hypothesis': HypothesisCardComponent,
  'assumption': AssumptionCardComponent,
  'evidence': EvidenceCardComponent,
  'experiment': ExperimentCardComponent,
  'observation': ObservationCardComponent,
  'claim': ClaimCardComponent,
  'critique': CritiqueCardComponent,
  'decision': DecisionCardComponent,
  'evaluation': EvaluationCardComponent,
  'theory': TheoryCardComponent,
  'misconception': MisconceptionCardComponent,
  'constraint': ConstraintCardComponent,
  'calculation': CalculationCardComponent,
  'target': TargetCardComponent,
  'design_artifact': DesignArtifactCardComponent,
  'architecture': ArchitectureCardComponent,
  'component': ComponentCardComponent,
};

export const CARD_IMPORTS = [
  ThoughtCardComponent,
  ConceptCardComponent,
  UnknownCardComponent,
  QuestionCardComponent,
  HypothesisCardComponent,
  AssumptionCardComponent,
  EvidenceCardComponent,
  ExperimentCardComponent,
  ObservationCardComponent,
  ClaimCardComponent,
  CritiqueCardComponent,
  DecisionCardComponent,
  EvaluationCardComponent,
  TheoryCardComponent,
  MisconceptionCardComponent,
  ConstraintCardComponent,
  CalculationCardComponent,
  TargetCardComponent,
  DesignArtifactCardComponent,
  ArchitectureCardComponent,
  ComponentCardComponent,
];

export function cardFor(object: IdeaObject): Type<unknown> {
  return CARD_COMPONENTS[object.type] ?? ThoughtCardComponent;
}
