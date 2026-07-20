import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Jamie public guide UI boundary', () => {
  it('uses the public workspace without operator-only labels or routes', () => {
    const componentPath = path.join(process.cwd(), 'components', 'chat', 'JamieGuideWorkspace.tsx');
    const loaderPath = path.join(process.cwd(), 'components', 'chat', 'JamieGuideLoader.tsx');
    const pagePath = path.join(process.cwd(), 'app', 'sites', '[site]', '[[...path]]', 'page.tsx');
    const component = fs.readFileSync(componentPath, 'utf8');
    const loader = fs.readFileSync(loaderPath, 'utf8');
    const page = fs.readFileSync(pagePath, 'utf8');

    expect(page).toContain('<JamieGuideLoader initialContext={context} featuredPrompt={curation.prompt} />');
    expect(loader).toContain("ssr: false");
    expect(page).not.toContain('JamieAssistantWorkspace apiRoute="/api/jamie/chat"');
    expect(component).toContain("api: '/api/jamie/guide'");
    expect(component).toContain("source: 'jamie_public_guide'");
    expect(component).toContain('No public chat transcript will be included.');
    expect(component).toContain('MessageResponse');
    expect(component).toContain("disallowedElements={['a']}");
    expect(component).not.toContain('/command-center');
    expect(component).not.toContain('TensorZero');
    expect(component).not.toContain('assistant-ui runtime');
  });
});
