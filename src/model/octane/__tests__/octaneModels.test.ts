/*
 * (c) Copyright 2024 Micro Focus or one of its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'node:fs';
import formatXml from 'xml-formatter';
import convert from 'xml-js';
import TestResources from '../../../test/TestResources';
import TestsResult from '../TestsResult';

let testResult: TestsResult;
let expectedXml: string;

beforeAll(() => {
  testResult = JSON.parse(
    fs.readFileSync(TestResources.ALM_OCTANE_JSON_MODEL_PATH).toString()
  );

  expectedXml = fs
    .readFileSync(TestResources.OCTANE_MODEL_CONVERTED_EXPECTED_PATH)
    .toString();
});

describe('Models should correctly map to the OpenText SDP / SDM XML format', () => {
  test('TestResults should map to the correct XML format', () => {
    const xml = convert.js2xml(testResult, { compact: true });
    expect(formatXml(xml)).toBe(formatXml(expectedXml));
  });
});
