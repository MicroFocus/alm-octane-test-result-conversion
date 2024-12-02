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

import Properties from './Properties';
import TestCase from './TestCase';

export default interface TestSuite {
  properties?: Properties;
  testcase: TestCase[];
  'system-out'?: string;
  'system-err'?: string;
  _attributes: {
    name: string;
    tests: string;
    failures?: string;
    errors?: string;
    time?: string;
    disabled?: string;
    skipped?: string;
    timestamp?: string;
    hostname?: string;
    id?: string;
    package?: string;
  };
}
