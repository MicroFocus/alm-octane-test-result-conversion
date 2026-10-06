/*
 * Copyright 2024-2026 Open Text.
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors ("Open Text") are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { xml2js, js2xml } from 'xml-js';
import formatXml from 'xml-formatter';
import {
  OctaneXmlBuilder,
  SuiteConfig,
  OctaneBuildConfig,
  TestFields
} from '../OctaneXmlBuilder';
import { TestRun, TestRunResult } from '../../model/octane/TestRun';

describe('OctaneXmlBuilder - Mode A (Build Context) - Backward Compatibility', () => {
  const buildConfig: OctaneBuildConfig = {
    server_id: 'serverId',
    job_id: 'myJob',
    build_id: '123'
  };

  const testRuns: TestRun[] = [
    {
      _attributes: {
        module: '',
        package: 'com.acme',
        class: 'LoginTest',
        name: 'testLogin',
        duration: 1200,
        status: TestRunResult.PASSED,
        started: 1759320000000
      }
    }
  ];

  const testFields: TestFields = {
    test_field: [
      {
        _attributes: {
          type: 'Test_Level',
          value: 'Unit Test'
        }
      }
    ]
  };

  test('Mode A: basic payload with build context', () => {
    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns(testRuns)
      .withTestFields(testFields)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testResult = parsed.test_result;

    // Verify build element is present
    expect(testResult.build).toBeDefined();
    expect(testResult.build._attributes.server_id).toBe('serverId');
    expect(testResult.build._attributes.job_id).toBe('myJob');
    expect(testResult.build._attributes.build_id).toBe('123');

    // Verify suite_ref is NOT present (Mode A)
    expect(testResult.suite_ref).toBeUndefined();

    // Verify test_runs are present
    // Note: xml2js with compact mode represents single element as object, multiple as array
    const testRunArray = Array.isArray(testResult.test_runs.test_run)
      ? testResult.test_runs.test_run
      : [testResult.test_runs.test_run];
    expect(testRunArray).toHaveLength(1);
    expect(testRunArray[0]._attributes.name).toBe('testLogin');
  });

  test('Mode A: with optional build config fields', () => {
    const extendedBuildConfig: OctaneBuildConfig = {
      server_id: 'serverId',
      job_id: 'myJob',
      job_name: 'My Job',
      build_id: '123',
      build_name: 'Build #123',
      sub_type: 'custom_type'
    };

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(extendedBuildConfig)
      .withTestRuns(testRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const build = parsed.test_result.build._attributes;

    expect(build.job_name).toBe('My Job');
    expect(build.build_name).toBe('Build #123');
    expect(build.sub_type).toBe('custom_type');
  });

  test('Mode A: multiple test runs', () => {
    const multipleRuns: TestRun[] = [
      {
        _attributes: {
          name: 'testOne',
          status: TestRunResult.PASSED,
          duration: 100
        }
      },
      {
        _attributes: {
          name: 'testTwo',
          status: TestRunResult.FAILED,
          duration: 200
        }
      },
      {
        _attributes: {
          name: 'testThree',
          status: TestRunResult.SKIPPED,
          duration: 0
        }
      }
    ];

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns(multipleRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testRunArray = parsed.test_result.test_runs.test_run;

    expect(Array.isArray(testRunArray)).toBe(true);
    expect(testRunArray).toHaveLength(3);
    expect(testRunArray[0]._attributes.name).toBe('testOne');
    expect(testRunArray[1]._attributes.name).toBe('testTwo');
    expect(testRunArray[2]._attributes.name).toBe('testThree');
  });

  test('Mode A: no suite_ref and no build should never coexist', () => {
    const builder = new OctaneXmlBuilder().withTestRuns(testRuns);

    expect(() => builder.build()).toThrow('Must specify either suite config or build config');
  });

  test('Mode A: all attributes properly serialized', () => {
    const complexRun: TestRun = {
      _attributes: {
        module: 'myModule',
        package: 'com.example',
        class: 'MyClass',
        name: 'myTest',
        status: TestRunResult.PASSED,
        duration: 5000,
        started: 1234567890000,
        run_type: 'Automated',
        external_report_url: 'https://example.com/report',
        external_test_id: 'ext-123',
        external_run_id: 'run-456',
        run_name: 'Main Run',
        manual: false
      }
    };

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns([complexRun])
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testRunArray = Array.isArray(parsed.test_result.test_runs.test_run)
      ? parsed.test_result.test_runs.test_run
      : [parsed.test_result.test_runs.test_run];
    const attrs = testRunArray[0]._attributes;

    expect(attrs.module).toBe('myModule');
    expect(attrs.package).toBe('com.example');
    expect(attrs.class).toBe('MyClass');
    expect(attrs.name).toBe('myTest');
    expect(attrs.status).toBe('Passed');
    expect(attrs.duration).toBe('5000'); // xml-js converts to string
    expect(attrs.started).toBe('1234567890000');
    expect(attrs.run_type).toBe('Automated');
    expect(attrs.external_report_url).toBe('https://example.com/report');
    expect(attrs.external_test_id).toBe('ext-123');
    expect(attrs.external_run_id).toBe('run-456');
    expect(attrs.run_name).toBe('Main Run');
    expect(attrs.manual).toBe('false');
  });
});

describe('OctaneXmlBuilder - Mode B (Suite Run) - New Feature', () => {
  const suiteConfig: SuiteConfig = {
    suite_id: 'suite-123',
    release_id: 'release-456'
  };

  const testRuns: TestRun[] = [
    {
      _attributes: {
        package: 'com.acme',
        class: 'LoginTest',
        name: 'testLogin',
        duration: 1200,
        status: TestRunResult.PASSED,
        started: 1759320000000
      }
    }
  ];

  test('Mode B: basic suite mode payload', () => {
    const xml = new OctaneXmlBuilder()
      .withSuiteConfig(suiteConfig)
      .withTestRuns(testRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testResult = parsed.test_result;

    // Verify build element is NOT present (Mode B)
    expect(testResult.build).toBeUndefined();

    // Verify suite_ref is present with required id
    expect(testResult.suite_ref).toBeDefined();
    expect(testResult.suite_ref._attributes.id).toBe('suite-123');

    // Verify release_ref is present
    expect(testResult.release_ref).toBeDefined();
    expect(testResult.release_ref._attributes.id).toBe('release-456');
  });

  test('Mode B: with all optional fields', () => {
    const fullSuiteConfig: SuiteConfig = {
      suite_id: 'suite-123',
      external_run_id: 'run-name-abc',
      release_id: 'release-456',
      program_id: 'program-789',
      milestone_id: 'milestone-999',
      component: 'MyComponent'
    };

    const xml = new OctaneXmlBuilder()
      .withSuiteConfig(fullSuiteConfig)
      .withTestRuns(testRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testResult = parsed.test_result;

    expect(testResult.suite_ref._attributes.id).toBe('suite-123');
    expect(testResult.suite_ref._attributes.external_run_id).toBe('run-name-abc');
    expect(testResult.suite_ref._attributes.component).toBe('MyComponent');

    expect(testResult.program_ref._attributes.id).toBe('program-789');
    expect(testResult.release_ref._attributes.id).toBe('release-456');
    expect(testResult.milestone_ref._attributes.id).toBe('milestone-999');

    // Verify build is still absent
    expect(testResult.build).toBeUndefined();
  });

  test('Mode B: release_id is mandatory - should throw without it', () => {
    const invalidSuiteConfig: any = {
      suite_id: 'suite-123'
      // Missing release_id
    };

    const builder = new OctaneXmlBuilder()
      .withSuiteConfig(invalidSuiteConfig)
      .withTestRuns([]);

    expect(() => builder.build()).toThrow(
      'release_id is mandatory in suite mode'
    );
  });

  test('Mode B: with empty external_run_id (Octane defaults to suite name)', () => {
    const xml = new OctaneXmlBuilder()
      .withSuiteConfig(suiteConfig)
      .withTestRuns(testRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const suiteRef = parsed.test_result.suite_ref._attributes;

    // When external_run_id is not provided, it should not appear in the XML
    expect(suiteRef.external_run_id).toBeUndefined();
  });

  test('Mode B: element order preserved (build, suite_ref, program_ref, release_ref, milestone_ref, test_fields, test_runs)', () => {
    const fullSuiteConfig: SuiteConfig = {
      suite_id: 'suite-123',
      external_run_id: 'run-abc',
      release_id: 'release-456',
      program_id: 'program-789',
      milestone_id: 'milestone-999'
    };

    const testFields: TestFields = {
      test_field: [
        {
          _attributes: {
            type: 'Framework',
            value: 'JUnit'
          }
        }
      ]
    };

    const xml = new OctaneXmlBuilder()
      .withSuiteConfig(fullSuiteConfig)
      .withTestRuns(testRuns)
      .withTestFields(testFields)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testResult = parsed.test_result;

    // Verify order by checking keys: suite_ref should come before release_ref
    const keys = Object.keys(testResult);
    const suiteRefIndex = keys.indexOf('suite_ref');
    const programRefIndex = keys.indexOf('program_ref');
    const releaseRefIndex = keys.indexOf('release_ref');
    const milestoneRefIndex = keys.indexOf('milestone_ref');
    const testRunsIndex = keys.indexOf('test_runs');

    expect(suiteRefIndex).toBeLessThan(programRefIndex);
    expect(programRefIndex).toBeLessThan(releaseRefIndex);
    expect(releaseRefIndex).toBeLessThan(milestoneRefIndex);
    expect(milestoneRefIndex).toBeLessThan(testRunsIndex);
  });
});

describe('OctaneXmlBuilder - Mutual Exclusivity and Error Handling', () => {
  test('Cannot specify both build config and suite config', () => {
    const buildConfig: OctaneBuildConfig = {
      server_id: 'server',
      job_id: 'job',
      build_id: '123'
    };

    const suiteConfig: SuiteConfig = {
      suite_id: 'suite-123',
      release_id: 'release-456'
    };

    const builder = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withSuiteConfig(suiteConfig)
      .withTestRuns([]);

    expect(() => builder.build()).toThrow(
      'Cannot specify both suite config and build config'
    );
  });

  test('Must specify either build config or suite config', () => {
    const builder = new OctaneXmlBuilder().withTestRuns([]);

    expect(() => builder.build()).toThrow(
      'Must specify either suite config or build config'
    );
  });
});

describe('OctaneXmlBuilder - String Escaping and Truncation', () => {
  test('XML special characters are escaped in attributes', () => {
    const buildConfig: OctaneBuildConfig = {
      server_id: 'server&id',
      job_id: 'job<name>',
      build_id: '123'
    };

    const testRun: TestRun = {
      _attributes: {
        name: 'test"with"quotes',
        package: 'com.example&test',
        class: 'Class<T>',
        duration: 100,
        status: TestRunResult.PASSED
      }
    };

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns([testRun])
      .build();

    // Verify XML is well-formed by parsing
    const parsed = xml2js(xml, { compact: true }) as any;
    const build = parsed.test_result.build._attributes;
    const testRunArray = Array.isArray(parsed.test_result.test_runs.test_run)
      ? parsed.test_result.test_runs.test_run
      : [parsed.test_result.test_runs.test_run];
    const testRunAttrs = testRunArray[0]._attributes;

    // After parsing, special characters should be unescaped back to original values
    expect(build.server_id).toBe('server&id');
    expect(build.job_id).toBe('job<name>');
    expect(testRunAttrs.package).toBe('com.example&test');
    expect(testRunAttrs.class).toBe('Class<T>');
  });

  test('Attributes are truncated to 255 characters in Mode B', () => {
    const longId = 'a'.repeat(300);
    const suiteConfig: SuiteConfig = {
      suite_id: longId,
      external_run_id: 'b'.repeat(300),
      release_id: 'c'.repeat(300),
      program_id: 'd'.repeat(300),
      milestone_id: 'e'.repeat(300),
      component: 'f'.repeat(300)
    };

    const xml = new OctaneXmlBuilder()
      .withSuiteConfig(suiteConfig)
      .withTestRuns([])
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testResult = parsed.test_result;

    expect(testResult.suite_ref._attributes.id.length).toBe(255);
    expect(testResult.suite_ref._attributes.external_run_id.length).toBe(255);
    expect(testResult.release_ref._attributes.id.length).toBe(255);
    expect(testResult.program_ref._attributes.id.length).toBe(255);
    expect(testResult.milestone_ref._attributes.id.length).toBe(255);
    expect(testResult.suite_ref._attributes.component.length).toBe(255);

    // Verify they all start with expected characters
    expect(testResult.suite_ref._attributes.id.startsWith('a')).toBe(true);
    expect(testResult.suite_ref._attributes.external_run_id.startsWith('b')).toBe(true);
    expect(testResult.release_ref._attributes.id.startsWith('c')).toBe(true);
  });

  test('Test run attributes are truncated to 255 characters', () => {
    const longName = 'x'.repeat(300);
    const testRun: TestRun = {
      _attributes: {
        name: longName,
        package: 'y'.repeat(300),
        class: 'z'.repeat(300),
        run_name: 'w'.repeat(300),
        duration: 100,
        status: TestRunResult.PASSED
      }
    };

    const buildConfig: OctaneBuildConfig = {
      server_id: 'server',
      job_id: 'job',
      build_id: '123'
    };

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns([testRun])
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const testRunArray = Array.isArray(parsed.test_result.test_runs.test_run)
      ? parsed.test_result.test_runs.test_run
      : [parsed.test_result.test_runs.test_run];
    const attrs = testRunArray[0]._attributes;

    // Verify truncation is applied
    expect(attrs.name.length).toBeLessThanOrEqual(255);
    expect(attrs.package.length).toBeLessThanOrEqual(255);
    expect(attrs.class.length).toBeLessThanOrEqual(255);
    expect(attrs.run_name.length).toBeLessThanOrEqual(255);
  });
});

describe('OctaneXmlBuilder - Test Statuses', () => {
  const buildConfig: OctaneBuildConfig = {
    server_id: 'server',
    job_id: 'job',
    build_id: '123'
  };

  test('supports all test statuses: Passed, Failed, Skipped, Planned', () => {
    const testRuns: TestRun[] = [
      {
        _attributes: {
          name: 'testPassed',
          status: TestRunResult.PASSED,
          duration: 100
        }
      },
      {
        _attributes: {
          name: 'testFailed',
          status: TestRunResult.FAILED,
          duration: 200
        }
      },
      {
        _attributes: {
          name: 'testSkipped',
          status: TestRunResult.SKIPPED,
          duration: 0
        }
      },
      {
        _attributes: {
          name: 'testPlanned',
          status: TestRunResult.PLANNED,
          duration: 0
        }
      }
    ];

    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns(testRuns)
      .build();

    const parsed = xml2js(xml, { compact: true }) as any;
    const runs = parsed.test_result.test_runs.test_run;

    expect(runs[0]._attributes.status).toBe('Passed');
    expect(runs[1]._attributes.status).toBe('Failed');
    expect(runs[2]._attributes.status).toBe('Skipped');
    expect(runs[3]._attributes.status).toBe('Planned');
  });
});

describe('OctaneXmlBuilder - Fluent API', () => {
  test('builder methods are chainable', () => {
    const buildConfig: OctaneBuildConfig = {
      server_id: 'server',
      job_id: 'job',
      build_id: '123'
    };

    const testRuns: TestRun[] = [
      {
        _attributes: {
          name: 'test1',
          duration: 100,
          status: TestRunResult.PASSED
        }
      }
    ];

    const testFields: TestFields = {
      test_field: [
        {
          _attributes: {
            type: 'Framework',
            value: 'JUnit'
          }
        }
      ]
    };

    // Verify fluent API works and produces valid XML
    const xml = new OctaneXmlBuilder()
      .withBuildConfig(buildConfig)
      .withTestRuns(testRuns)
      .withTestFields(testFields)
      .build();

    expect(typeof xml).toBe('string');
    expect(xml).toContain('<test_result>');
    expect(xml).toContain('</test_result>');
  });
});
