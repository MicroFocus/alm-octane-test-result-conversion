import * as fs from 'node:fs';
import { xml2js } from 'xml-js';
import formatXml from 'xml-formatter';
import {
  convertGherkinXMLToBuildAndSuiteResults,
  convertGherkinXMLToOctaneXML,
  convertJUnitXMLToBuildAndSuiteResults,
  convertJUnitXMLToOctaneXML
} from '../../index';
import TestResources from '../../test/TestResources';
import { FrameworkType } from '../../model/common/FrameworkType';
import OctaneBuildConfig from '../OctaneBuildConfig';
import { SuiteConfig } from '../OctaneXmlBuilder';

const buildConfig: OctaneBuildConfig = {
  server_id: 'server-1',
  job_id: 'job-1',
  build_id: 'build-1'
};

const suiteConfig: SuiteConfig = {
  suite_id: 'suite-1',
  release_id: 'release-1',
  milestone_id: 'milestone-1'
};

const junitFirstXml = `<?xml version="1.0"?>
<testsuite name="first" tests="2">
  <testcase classname="FirstTests" name="passes" time="0.1" />
  <testcase classname="FirstTests" name="fails" time="0.2">
    <failure type="AssertionError">expected true</failure>
  </testcase>
</testsuite>`;

const junitSecondXml = `<?xml version="1.0"?>
<testsuite name="second" tests="2">
  <testcase classname="SecondTests" name="skips" time="0.3">
    <skipped />
  </testcase>
  <testcase classname="SecondTests" name="passes too" time="0.4" />
</testsuite>`;

const gherkinFirstXml = `<?xml version="1.0"?>
<features version="1">
  <feature name="First feature" path="first.feature">
    <scenarios>
      <scenario name="passes">
        <steps>
          <step name="given a passing step" duration="2" status="passed" />
        </steps>
      </scenario>
    </scenarios>
  </feature>
</features>`;

const gherkinSecondXml = `<?xml version="1.0"?>
<features version="1">
  <feature name="Second &amp; third" path="second.feature">
    <scenarios>
      <scenario name="fails">
        <steps>
          <step name="given a failing step" duration="3" status="failed" />
        </steps>
      </scenario>
    </scenarios>
  </feature>
  <feature name="Fourth feature" path="fourth.feature">
    <scenarios>
      <scenario name="passes">
        <steps>
          <step name="given a passing step" duration="4" status="passed" />
        </steps>
      </scenario>
    </scenarios>
  </feature>
</features>`;

const parse = (xml: string): any => xml2js(xml, { compact: true }) as any;

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const countOccurrences = (text: string, token: string): number =>
  text.split(token).length - 1;

describe('Multiple test result files are merged into a single OpenText SDP / SDM result', () => {
  describe('convertJUnitXMLToOctaneXML', () => {
    let singleSuiteXml: string;
    let twoSuitesXml: string;

    beforeAll(() => {
      singleSuiteXml = fs.readFileSync(TestResources.JUNIT_SINGLE_TEST_SUITE_PATH).toString();
      twoSuitesXml = fs.readFileSync(TestResources.JUNIT_TWO_TEST_SUITES_PATH).toString();
    });

    test('single-element array produces the same output as a single string', () => {
      expect(convertJUnitXMLToOctaneXML([singleSuiteXml], buildConfig)).toBe(
        convertJUnitXMLToOctaneXML(singleSuiteXml, buildConfig)
      );
    });

    test('test runs of all files are merged, in order, under a single test_result', () => {
      const firstRuns = asArray(
        parse(convertJUnitXMLToOctaneXML(singleSuiteXml, buildConfig)).test_result.test_runs.test_run
      );
      const secondRuns = asArray(
        parse(convertJUnitXMLToOctaneXML(twoSuitesXml, buildConfig)).test_result.test_runs.test_run
      );

      const merged = convertJUnitXMLToOctaneXML([singleSuiteXml, twoSuitesXml], buildConfig);
      const mergedResult = parse(merged).test_result;

      expect(countOccurrences(merged, '<test_result>')).toBe(1);
      expect(countOccurrences(merged, '<build ')).toBe(1);
      expect(countOccurrences(merged, '<test_runs>')).toBe(1);
      expect(mergedResult.build._attributes).toEqual(buildConfig);
      expect(asArray(mergedResult.test_runs.test_run)).toEqual([...firstRuns, ...secondRuns]);
    });

    test('external run id and framework are applied to the runs of every file', () => {
      const merged = convertJUnitXMLToOctaneXML(
        [junitFirstXml, junitSecondXml],
        { ...buildConfig, external_run_id: 'run-42' },
        FrameworkType.JUnit
      );
      const runs = asArray<any>(parse(merged).test_result.test_runs.test_run);

      expect(runs.map(run => run._attributes.name)).toEqual(['passes', 'fails', 'skips', 'passes too']);
      runs.forEach(run => expect(run._attributes.external_run_id).toBe('run-42'));
    });
  });

  describe('convertGherkinXMLToOctaneXML', () => {
    let twoFeaturesXml: string;
    let skippedScenariosXml: string;

    beforeAll(() => {
      twoFeaturesXml = fs.readFileSync(TestResources.GHERKIN_TWO_FEATURES_PATH).toString();
      skippedScenariosXml = fs.readFileSync(TestResources.GHERKIN_SKIPPED_SCENARIOS_PATH).toString();
    });

    test('single-element array produces the same output as a single string', () => {
      expect(
        formatXml(convertGherkinXMLToOctaneXML([twoFeaturesXml], buildConfig, FrameworkType.Cucumber))
      ).toBe(
        formatXml(convertGherkinXMLToOctaneXML(twoFeaturesXml, buildConfig, FrameworkType.Cucumber))
      );
    });

    test('Gherkin test runs of all files are merged, in order, under a single test_result', () => {
      const firstRuns = asArray(
        parse(convertGherkinXMLToOctaneXML(twoFeaturesXml, buildConfig, FrameworkType.Cucumber))
          .test_result.test_runs.gherkin_test_run
      );
      const secondRuns = asArray(
        parse(convertGherkinXMLToOctaneXML(skippedScenariosXml, buildConfig, FrameworkType.Cucumber))
          .test_result.test_runs.gherkin_test_run
      );

      const merged = convertGherkinXMLToOctaneXML(
        [twoFeaturesXml, skippedScenariosXml],
        buildConfig,
        FrameworkType.Cucumber
      );
      const mergedResult = parse(merged).test_result;

      expect(countOccurrences(merged, '<test_result>')).toBe(1);
      expect(countOccurrences(merged, '<test_runs>')).toBe(1);
      expect(asArray(mergedResult.test_runs.gherkin_test_run)).toEqual([...firstRuns, ...secondRuns]);
    });
  });

  describe('convertJUnitXMLToBuildAndSuiteResults', () => {
    test('single-element array produces the same output as a single string', () => {
      expect(convertJUnitXMLToBuildAndSuiteResults([junitFirstXml], buildConfig, suiteConfig)).toEqual(
        convertJUnitXMLToBuildAndSuiteResults(junitFirstXml, buildConfig, suiteConfig)
      );
    });

    test('both payloads contain the merged runs of all files and only their own header', () => {
      const result = convertJUnitXMLToBuildAndSuiteResults(
        [junitFirstXml, junitSecondXml],
        buildConfig,
        suiteConfig
      );
      const buildPayload = parse(result.buildContextXml!).test_result;
      const suitePayload = parse(result.suiteRunXml!).test_result;
      const runs = asArray<any>(buildPayload.test_runs.test_run);

      expect(countOccurrences(result.buildContextXml!, '<test_result>')).toBe(1);
      expect(countOccurrences(result.suiteRunXml!, '<test_result>')).toBe(1);

      expect(buildPayload.build._attributes).toEqual(buildConfig);
      expect(buildPayload.suite_ref).toBeUndefined();
      expect(buildPayload.release_ref).toBeUndefined();

      expect(suitePayload.build).toBeUndefined();
      expect(suitePayload.suite_ref._attributes.id).toBe(suiteConfig.suite_id);
      expect(suitePayload.release_ref._attributes.id).toBe(suiteConfig.release_id);
      expect(suitePayload.milestone_ref._attributes.id).toBe(suiteConfig.milestone_id);

      expect(runs.map(run => run._attributes)).toEqual([
        expect.objectContaining({ class: 'FirstTests', name: 'passes', status: 'Passed', duration: '100' }),
        expect.objectContaining({ class: 'FirstTests', name: 'fails', status: 'Failed', duration: '200' }),
        expect.objectContaining({ class: 'SecondTests', name: 'skips', status: 'Skipped', duration: '300' }),
        expect.objectContaining({ class: 'SecondTests', name: 'passes too', status: 'Passed', duration: '400' })
      ]);
      expect(suitePayload.test_fields).toEqual(buildPayload.test_fields);
      expect(suitePayload.test_runs).toEqual(buildPayload.test_runs);
    });

    test('test fields and test runs are serialized identically in both payloads', () => {
      const result = convertJUnitXMLToBuildAndSuiteResults(
        [junitFirstXml, junitSecondXml],
        buildConfig,
        suiteConfig
      );
      const body = (xml: string) => xml.substring(xml.indexOf('<test_fields>'));

      expect(body(result.suiteRunXml!)).toBe(body(result.buildContextXml!));
    });
  });

  describe('convertGherkinXMLToBuildAndSuiteResults', () => {
    test('single-element array produces the same output as a single string', () => {
      expect(
        convertGherkinXMLToBuildAndSuiteResults([gherkinFirstXml], buildConfig, suiteConfig)
      ).toEqual(convertGherkinXMLToBuildAndSuiteResults(gherkinFirstXml, buildConfig, suiteConfig));
    });

    test('both payloads contain the merged Gherkin runs of all files and only their own header', () => {
      const result = convertGherkinXMLToBuildAndSuiteResults(
        [gherkinFirstXml, gherkinSecondXml],
        buildConfig,
        suiteConfig
      );
      const buildPayload = parse(result.buildContextXml!).test_result;
      const suitePayload = parse(result.suiteRunXml!).test_result;
      const runs = asArray<any>(buildPayload.test_runs.gherkin_test_run);

      expect(countOccurrences(result.buildContextXml!, '<test_result>')).toBe(1);
      expect(countOccurrences(result.suiteRunXml!, '<test_result>')).toBe(1);

      expect(buildPayload.build._attributes).toEqual(buildConfig);
      expect(buildPayload.suite_ref).toBeUndefined();
      expect(suitePayload.build).toBeUndefined();
      expect(suitePayload.suite_ref._attributes.id).toBe(suiteConfig.suite_id);

      expect(runs.map(run => run._attributes)).toEqual([
        expect.objectContaining({ name: 'First feature', status: 'Passed', duration: '2' }),
        expect.objectContaining({ name: 'Second & third', status: 'Failed', duration: '3' }),
        expect.objectContaining({ name: 'Fourth feature', status: 'Passed', duration: '4' })
      ]);
      expect(runs[1].feature._attributes.name).toBe('Second & third');
      expect(suitePayload.test_runs).toEqual(buildPayload.test_runs);
    });

    test('test fields and test runs are serialized identically in both payloads', () => {
      const result = convertGherkinXMLToBuildAndSuiteResults(
        [gherkinFirstXml, gherkinSecondXml],
        buildConfig,
        suiteConfig
      );
      const body = (xml: string) => xml.substring(xml.indexOf('<test_fields>'));

      expect(body(result.suiteRunXml!)).toBe(body(result.buildContextXml!));
    });
  });
});
