// VSCode will assign some default values to the setitngs based on the package.json defaults
import { CustomParameter, PagesSettings } from '../../src/types';

// So, imitate this behaviour for the tests
export const defaultSettings = {
  customParameters: new Array<CustomParameter>(),
  formatConfOverride: {},
  onTypeFormat: false,
  pages: {} as PagesSettings,
  pureTextSteps: false,
  skipDocStringsFormat: false,
  smartSnippets: false,
  steps: new Array<string>(),
  stepsInvariants: false,
  strictGherkinCompletion: false,
  strictGherkinValidation: false,
  syncfeatures: 'test/features/*.feature',
}