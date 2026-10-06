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

import escapeXML from 'xml-escape';
import { js2xml } from 'xml-js';
import BuildContext from '../model/octane/BuildContext';
import SuiteRef from '../model/octane/SuiteRef';
import ProgramRef from '../model/octane/ProgramRef';
import ReleaseRef from '../model/octane/ReleaseRef';
import MilestoneRef from '../model/octane/MilestoneRef';
import TestsResult from '../model/octane/TestsResult';
import { TestRun, TestRunResult } from '../model/octane/TestRun';

/**
 * Suite mode configuration for Mode B (suite run injection).
 */
export interface SuiteConfig {
  /** Test suite entity id (required for suite mode) */
  suite_id: string;
  /** Suite run name; if empty/absent, Octane defaults to suite's own name */
  external_run_id?: string;
  /** Release id (MANDATORY - validation occurs before building) */
  release_id: string;
  /** Optional program id */
  program_id?: string;
  /** Optional milestone id */
  milestone_id?: string;
  /** Optional component name */
  component?: string;
}

/**
 * Builder for ALM Octane test-results XML payloads supporting two modes:
 * - Mode A (build-context): existing behavior, byte-for-byte unchanged
 * - Mode B (suite-run): opt-in mode for suite-scoped result injection
 */
export class OctaneXmlBuilder {
  private testRuns: TestRun[];
  private testRunElementName: string;
  private testFields?: TestFields;
  private suiteConfig?: SuiteConfig;
  private buildConfig?: OctaneBuildConfig;

  constructor() {
    this.testRuns = [];
    this.testRunElementName = 'test_run';
  }

  /**
   * Set test runs to be included in the payload.
   */
  withTestRuns(testRuns: TestRun[]): OctaneXmlBuilder {
    this.testRuns = testRuns;
    this.testRunElementName = 'test_run';
    return this;
  }

  /**
   * Set Gherkin test runs to be included in the payload.
   */
  withGherkinTestRuns(testRuns: TestRun[]): OctaneXmlBuilder {
    this.testRuns = testRuns;
    this.testRunElementName = 'gherkin_test_run';
    return this;
  }

  /**
   * Set test fields for the payload.
   */
  withTestFields(testFields: TestFields): OctaneXmlBuilder {
    this.testFields = testFields;
    return this;
  }

  /**
   * Set build context configuration (Mode A).
   * Mutually exclusive with suite configuration.
   */
  withBuildConfig(buildConfig: OctaneBuildConfig): OctaneXmlBuilder {
    this.buildConfig = buildConfig;
    return this;
  }

  /**
   * Set suite configuration (Mode B).
   * Mutually exclusive with build configuration.
   * Release_id validation occurs during build().
   */
  withSuiteConfig(suiteConfig: SuiteConfig): OctaneXmlBuilder {
    this.suiteConfig = suiteConfig;
    return this;
  }

  /**
   * Build the XML payload.
   * Detects mode automatically:
   * - If suite config present: Mode B (suite run)
   * - If build config present: Mode A (build context)
   * - If both or neither: throws error
   *
   * @returns XML string conforming to Octane's test-results schema
   * @throws Error if configuration is invalid or both/neither modes are specified
   */
  build(): string {
    if (this.suiteConfig && this.buildConfig) {
      throw new Error(
        "Cannot specify both suite config and build config. " +
          "They are mutually exclusive: '<suite_ref>' and '<build>' cannot coexist."
      );
    }

    if (!this.suiteConfig && !this.buildConfig) {
      throw new Error('Must specify either suite config or build config');
    }

    // Validate suite config before building
    if (this.suiteConfig && !this.suiteConfig.release_id) {
      throw new Error(
        'release_id is mandatory in suite mode. ' +
          'Octane fails with: "No release is found for test result injection into suite"'
      );
    }

    // Apply truncation to all test run attributes (255-char limit)
    const truncatedTestRuns = this.testRuns.map(run => this.truncateTestRunAttributes(run));

    // Temporarily replace test runs for XML generation
    const originalTestRuns = this.testRuns;
    this.testRuns = truncatedTestRuns;

    const testResultObj = this.suiteConfig
      ? this.buildSuiteModePayload()
      : this.buildBuildContextModePayload();

    // Restore original test runs
    this.testRuns = originalTestRuns;

    return js2xml(testResultObj, { compact: true });
  }

  /**
   * Truncate all string attributes in a test run to 255 characters.
   */
  private truncateTestRunAttributes(run: TestRun): TestRun {
    const truncatedAttrs: any = {};

    for (const [key, value] of Object.entries(run._attributes)) {
      if (typeof value === 'string') {
        truncatedAttrs[key] = this.truncateToMaxLength(value, 255);
      } else {
        truncatedAttrs[key] = value;
      }
    }

    return {
      ...run,
      _attributes: this.escapeAttributes(truncatedAttrs)
    };
  }

  /**
   * Build Mode A (build-context) payload.
   * This maintains exact compatibility with the existing format.
   */
  private buildBuildContextModePayload(): any {
    const result: any = {
      test_result: {}
    };

    // Element order (schema-enforced): build, suite_ref, ...
    // Mode A: emit build, skip suite_ref
    if (this.buildConfig) {
      result.test_result.build = {
        _attributes: this.escapeAttributes(this.buildConfig)
      };
    }

    if (this.testFields) {
      result.test_result.test_fields = this.testFields;
    }

    result.test_result.test_runs = {
      [this.testRunElementName]: this.testRuns
    };

    return result;
  }

  /**
   * Build Mode B (suite run) payload.
   * Emits suite_ref, program_ref, release_ref, milestone_ref instead of build.
   * Element order is maintained per schema.
   */
  private buildSuiteModePayload(): any {
    if (!this.suiteConfig) {
      throw new Error('Suite config required for suite mode');
    }

    const result: any = {
      test_result: {}
    };

    // Element order (schema-enforced): build, suite_ref, program_ref, release_ref, milestone_ref, ...
    // Mode B: skip build, emit suite_ref and refs

    // suite_ref (required in Mode B)
    const suiteRefAttrs: any = {
      id: this.truncateToMaxLength(this.suiteConfig.suite_id, 255)
    };
    if (this.suiteConfig.external_run_id) {
      suiteRefAttrs.external_run_id = this.truncateToMaxLength(
        this.suiteConfig.external_run_id,
        255
      );
    }
    if (this.suiteConfig.component) {
      suiteRefAttrs.component = this.truncateToMaxLength(
        this.suiteConfig.component,
        255
      );
    }
    result.test_result.suite_ref = {
      _attributes: this.escapeAttributes(suiteRefAttrs)
    };

    // program_ref (optional)
    if (this.suiteConfig.program_id) {
      result.test_result.program_ref = {
        _attributes: this.escapeAttributes({
          id: this.truncateToMaxLength(this.suiteConfig.program_id, 255)
        })
      };
    }

    // release_ref (MANDATORY in Mode B)
    result.test_result.release_ref = {
      _attributes: this.escapeAttributes({
        id: this.truncateToMaxLength(this.suiteConfig.release_id, 255)
      })
    };

    // milestone_ref (optional)
    if (this.suiteConfig.milestone_id) {
      result.test_result.milestone_ref = {
        _attributes: this.escapeAttributes({
          id: this.truncateToMaxLength(this.suiteConfig.milestone_id, 255)
        })
      };
    }

    if (this.testFields) {
      result.test_result.test_fields = this.testFields;
    }

    result.test_result.test_runs = {
      [this.testRunElementName]: this.testRuns
    };

    return result;
  }

  /**
   * Truncate string to maximum length.
   * Used to enforce 255-char limits on attributes.
   */
  private truncateToMaxLength(value: string | undefined, maxLength: number): string {
    if (!value) return '';
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  /**
   * Escape XML special characters in attribute values.
   * This ensures attributes like server_id="server&id" are properly escaped.
   */
  private escapeAttributes(obj: any): any {
    const escaped: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        escaped[key] = escapeXML(value);
      } else {
        escaped[key] = value;
      }
    }
    return escaped;
  }
}

/**
 * Test fields interface for the payload.
 */
export interface TestFields {
  test_field: Array<{
    _attributes: {
      type: string;
      value: string;
    };
  }>;
}

/**
 * Build context interface for Mode A.
 */
export interface OctaneBuildConfig {
  server_id: string;
  job_id: string;
  job_name?: string;
  build_id: string;
  build_name?: string;
  sub_type?: string;
  artifact_id?: string;
  external_run_id?: string;
}
