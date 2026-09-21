const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'apps/ideate/src/app/cards');
const types = [
  ['thought', 'Thought'],
  ['concept', 'Concept'],
  ['unknown', 'Unknown'],
  ['question', 'Question'],
  ['hypothesis', 'Hypothesis'],
  ['assumption', 'Assumption'],
  ['evidence', 'Evidence'],
  ['experiment', 'Experiment'],
  ['observation', 'Observation'],
  ['claim', 'Claim'],
  ['critique', 'Critique'],
  ['decision', 'Decision'],
  ['evaluation', 'Evaluation'],
  ['theory', 'Theory'],
  ['misconception', 'Misconception'],
  ['constraint', 'Constraint'],
  ['calculation', 'Calculation'],
  ['target', 'Target'],
  ['design_artifact', 'DesignArtifact'],
  ['architecture', 'Architecture'],
  ['component', 'Component'],
];
const classNames = [];
for (const [type, name] of types) {
  const cls = `${name}CardComponent`;
  classNames.push({ type, cls, file: `${type.replace('_', '-')}-card.component` });
  const src = `import { Component, input, output } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { ObjectCardChromeComponent } from './object-card-chrome.component';

@Component({
  selector: 'ideate-${type.replace('_', '-')}-card',
  imports: [ObjectCardChromeComponent],
  template: \`
    <ideate-object-card-chrome
      [object]="object()"
      (open)="open.emit($event)"
      (typeChange)="typeChange.emit($event)"
      (newNode)="newNode.emit($event)"
      (menu)="menu.emit($event)"
      (openChat)="openChat.emit($event)"
    />
  \`,
})
export class ${cls} {
  readonly object = input.required<IdeaObject>();
  readonly open = output<IdeaObject>();
  readonly typeChange = output<string>();
  readonly newNode = output<IdeaObject>();
  readonly menu = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();
}
`;
  fs.writeFileSync(path.join(dir, `${type.replace('_', '-')}-card.component.ts`), src);
}
const registry = `import { Type } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
${classNames.map((c) => `import { ${c.cls} } from './${c.file}';`).join('\n')}

export const CARD_COMPONENTS: Record<string, Type<unknown>> = {
${classNames.map((c) => `  '${c.type}': ${c.cls},`).join('\n')}
};

export const CARD_IMPORTS = [
${classNames.map((c) => `  ${c.cls},`).join('\n')}
];

export function cardFor(object: IdeaObject): Type<unknown> {
  return CARD_COMPONENTS[object.type] ?? ThoughtCardComponent;
}
`;
fs.writeFileSync(path.join(dir, 'card-registry.ts'), registry);
console.log('wrote', classNames.length, 'cards');
