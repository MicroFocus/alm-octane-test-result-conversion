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
 * Result containing build-context and/or suite-run payloads.
 * At least one mode payload will always be present.
 */
export interface BuildAndSuiteResults {
  /** Mode A payload (Build Context) - for CI-centric endpoint */
  buildContextXml?: string;
  /** Mode B payload (Suite Run) - for workspace-scoped endpoint */
  suiteRunXml?: string;
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

    const results = this.buildAll();
    return (this.suiteConfig ? results.suiteRunXml : results.buildContextXml)!;
  }

  /**
   * Build the XML payloads for every configured mode (build context and/or suite run).
   * The test fields and test runs are serialized only once and shared by all payloads;
   * only the mode-specific header elements differ.
   *
   * @returns object with `buildContextXml` and/or `suiteRunXml`
   * @throws Error if neither mode is configured or the suite config is invalid
   */
  buildAll(): BuildAndSuiteResults {
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

    const bodyXml = js2xml(this.buildBody(), { compact: true });
    const results: BuildAndSuiteResults = {};

    if (this.buildConfig) {
      results.buildContextXml = this.wrapPayload(this.buildBuildContextHeader(), bodyXml);
    }

    if (this.suiteConfig) {
      results.suiteRunXml = this.wrapPayload(this.buildSuiteHeader(), bodyXml);
    }

    return results;
  }

  /**
   * Wrap the serialized header and body elements in the test_result root element.
   */
  private wrapPayload(header: any, bodyXml: string): string {
    return `<test_result>${js2xml(header, { compact: true })}${bodyXml}</test_result>`;
  }

  /**
   * Build the mode-independent part of the payload (test_fields and test_runs).
   * Element order (schema-enforced): test_fields, test_runs.
   */
  private buildBody(): any {
    const body: any = {};

    if (this.testFields) {
      body.test_fields = this.testFields;
    }

    // Apply truncation to all test run attributes (255-char limit)
    body.test_runs = {
      [this.testRunElementName]: this.testRuns.map(run => this.truncateTestRunAttributes(run))
    };

    return body;
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
   * Build Mode A (build-context) header elements.
   * This maintains exact compatibility with the existing format.
   */
  private buildBuildContextHeader(): any {
    return {
      build: {
        _attributes: this.escapeAttributes(this.buildConfig)
      }
    };
  }

  /**
   * Build Mode B (suite run) header elements.
   * Emits suite_ref, program_ref, release_ref, milestone_ref instead of build.
   * Element order is maintained per schema.
   */
  private buildSuiteHeader(): any {
    if (!this.suiteConfig) {
      throw new Error('Suite config required for suite mode');
    }

    const header: any = {};

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
    header.suite_ref = {
      _attributes: this.escapeAttributes(suiteRefAttrs)
    };

    // program_ref (optional)
    if (this.suiteConfig.program_id) {
      header.program_ref = {
        _attributes: this.escapeAttributes({
          id: this.truncateToMaxLength(this.suiteConfig.program_id, 255)
        })
      };
    }

    // release_ref (MANDATORY in Mode B)
    header.release_ref = {
      _attributes: this.escapeAttributes({
        id: this.truncateToMaxLength(this.suiteConfig.release_id, 255)
      })
    };

    // milestone_ref (optional)
    if (this.suiteConfig.milestone_id) {
      header.milestone_ref = {
        _attributes: this.escapeAttributes({
          id: this.truncateToMaxLength(this.suiteConfig.milestone_id, 255)
        })
      };
    }

    return header;
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
