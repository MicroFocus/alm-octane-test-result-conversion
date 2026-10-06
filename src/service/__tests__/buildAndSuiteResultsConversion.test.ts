import { xml2js } from 'xml-js';
import {
  convertGherkinXMLToBuildAndSuiteResults,
  convertJUnitXMLToBuildAndSuiteResults
} from '../../index';
import OctaneBuildConfig from '../OctaneBuildConfig';
import { SuiteConfig, TestFields } from '../OctaneXmlBuilder';

const buildConfig: OctaneBuildConfig = {
  server_id: 'server-1',
  job_id: 'job-1',
  build_id: 'build-1'
};

const suiteConfig: SuiteConfig = {
  suite_id: 'suite-1',
  release_id: 'release-1',
  program_id: 'program-1',
  milestone_id: 'milestone-1'
};

const customTestFields: TestFields = {
  test_field: [
    {
      _attributes: {
        type: 'Test_Type',
        value: 'Regression'
      }
    }
  ]
};

const junitXml = `<?xml version="1.0"?>
<testsuite name="sample" tests="3">
  <testcase classname="SampleTests" name="passes" time="0.125" />
  <testcase classname="SampleTests" name="fails" time="0.25">
    <failure type="AssertionError">expected true</failure>
  </testcase>
  <testcase classname="SampleTests" name="skips" time="0.5">
    <skipped />
  </testcase>
</testsuite>`;

const gherkinXml = `<?xml version="1.0"?>
<features version="1">
  <feature name="Sample feature" path="sample.feature">
    <scenarios>
      <scenario name="passes">
        <steps>
          <step name="given a passing step" duration="2" status="passed" />
        </steps>
      </scenario>
      <scenario name="fails">
        <steps>
          <step name="given a failing step" duration="3" status="failed" />
        </steps>
      </scenario>
    </scenarios>
  </feature>
</features>`;

const parsePayload = (xml: string): any =>
  (xml2js(xml, { compact: true }) as any).test_result;

const asArray = <T>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

describe('build-and-suite conversion exports', () => {
  describe('JUnit', () => {
    test('build-context mode emits build and preserves JUnit statuses and durations', () => {
      const result = convertJUnitXMLToBuildAndSuiteResults(junitXml, buildConfig);
      const payload = parsePayload(result.buildContextXml!);
      const testRuns = asArray(payload.test_runs.test_run);

      expect(result.suiteRunXml).toBeUndefined();
      expect(payload.build._attributes).toEqual(buildConfig);
      expect(payload.suite_ref).toBeUndefined();
      expect(testRuns.map((run) => run._attributes)).toEqual([
        expect.objectContaining({ name: 'passes', status: 'Passed', duration: '125' }),
        expect.objectContaining({ name: 'fails', status: 'Failed', duration: '250' }),
        expect.objectContaining({ name: 'skips', status: 'Skipped', duration: '500' })
      ]);
      expect(testRuns[1].error._attributes.type).toBe('AssertionError');
      expect(payload.test_fields.test_field[2]._attributes.value).toBe('JUnit');
    });

    test('suite-run mode emits suite references and custom test fields without build', () => {
      const result = convertJUnitXMLToBuildAndSuiteResults(
        junitXml,
        undefined,
        suiteConfig,
        customTestFields
      );
      const payload = parsePayload(result.suiteRunXml!);

      expect(result.buildContextXml).toBeUndefined();
      expect(payload.build).toBeUndefined();
      expect(payload.suite_ref._attributes.id).toBe(suiteConfig.suite_id);
      expect(payload.program_ref._attributes.id).toBe(suiteConfig.program_id);
      expect(payload.release_ref._attributes.id).toBe(suiteConfig.release_id);
      expect(payload.milestone_ref._attributes.id).toBe(suiteConfig.milestone_id);
      expect(asArray(payload.test_fields.test_field)).toEqual(customTestFields.test_field);
      expect(asArray(payload.test_runs.test_run)).toHaveLength(3);
    });

    test('both modes contain the same converted runs and keep their mode-specific roots exclusive', () => {
      const result = convertJUnitXMLToBuildAndSuiteResults(junitXml, buildConfig, suiteConfig);
      const buildPayload = parsePayload(result.buildContextXml!);
      const suitePayload = parsePayload(result.suiteRunXml!);

      expect(buildPayload.build).toBeDefined();
      expect(buildPayload.suite_ref).toBeUndefined();
      expect(suitePayload.suite_ref).toBeDefined();
      expect(suitePayload.build).toBeUndefined();
      expect(buildPayload.test_runs).toEqual(suitePayload.test_runs);
    });

    test('requires at least one mode configuration', () => {
      expect(() => convertJUnitXMLToBuildAndSuiteResults(junitXml)).toThrow(
        'Must provide either buildConfig (Mode A) or suiteConfig (Mode B) or both'
      );
    });
  });

  describe('Gherkin', () => {
    test('build-context mode emits Gherkin runs and default framework fields', () => {
      const result = convertGherkinXMLToBuildAndSuiteResults(gherkinXml, buildConfig);
      const payload = parsePayload(result.buildContextXml!);
      const testRuns = asArray(payload.test_runs.gherkin_test_run);

      expect(result.suiteRunXml).toBeUndefined();
      expect(payload.build._attributes).toEqual(buildConfig);
      expect(payload.suite_ref).toBeUndefined();
      expect(testRuns).toHaveLength(1);
      expect(testRuns[0]._attributes).toEqual(
        expect.objectContaining({ name: 'Sample feature', status: 'Failed', duration: '5' })
      );
      expect(payload.test_fields.test_field[2]._attributes.value).toBe('Cucumber');
    });

    test('suite-run mode emits Gherkin runs and suite references without build', () => {
      const result = convertGherkinXMLToBuildAndSuiteResults(
        gherkinXml,
        undefined,
        suiteConfig,
        customTestFields
      );
      const payload = parsePayload(result.suiteRunXml!);

      expect(result.buildContextXml).toBeUndefined();
      expect(payload.build).toBeUndefined();
      expect(payload.suite_ref._attributes.id).toBe(suiteConfig.suite_id);
      expect(payload.release_ref._attributes.id).toBe(suiteConfig.release_id);
      expect(asArray(payload.test_fields.test_field)).toEqual(customTestFields.test_field);
      expect(payload.test_runs.gherkin_test_run).toBeDefined();
      expect(payload.test_runs.test_run).toBeUndefined();
    });

    test('both modes contain the same Gherkin runs and keep their mode-specific roots exclusive', () => {
      const result = convertGherkinXMLToBuildAndSuiteResults(gherkinXml, buildConfig, suiteConfig);
      const buildPayload = parsePayload(result.buildContextXml!);
      const suitePayload = parsePayload(result.suiteRunXml!);

      expect(buildPayload.build).toBeDefined();
      expect(buildPayload.suite_ref).toBeUndefined();
      expect(suitePayload.suite_ref).toBeDefined();
      expect(suitePayload.build).toBeUndefined();
      expect(buildPayload.test_runs.gherkin_test_run).toEqual(
        suitePayload.test_runs.gherkin_test_run
      );
    });

    test('requires at least one mode configuration', () => {
      expect(() => convertGherkinXMLToBuildAndSuiteResults(gherkinXml)).toThrow(
        'Must provide either buildConfig (Mode A) or suiteConfig (Mode B) or both'
      );
    });
  });
});