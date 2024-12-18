## 1. Introduction 🚀

In the following documentation, the **OpenText Core Software Delivery Platform** and **OpenText Software Delivery Management** will collectively be referred to as 'the product'.

This is a Node.JS library for converting different kinds of test reports into **the product's** format.

---

## 2. Table of Contents

- [1. Introduction](#1-introduction-)
- [2. Table of Contents](#2-table-of-contents)
- [3. Supported Formats](#3-supported-formats)
- [4. Getting Started](#4-getting-started)
  - [4.1. Install Package](#41-install-package)
  - [4.2. Usage Examples](#42-usage-examples)
    - [4.2.1. Convert JUnit results](#421-convert-junit-results)
    - [4.2.2. Convert Gherkin results](#422-convert-gherkin-results)
- [5. Change log](#5-change-log)

---

## 3. Supported Formats

The tool supports the following test result formats which can be converted to the format accepted by **the product** ([documentation reference](https://admhelp.microfocus.com/octane/en/23.4-24.3/Online/Content/API/test-results.htm)):

- JUnit
- Gherkin

---

## 4. Getting Started

### 4.1. Install Package

The library is released as a NPM package: [@microfocus/alm-octane-test-result-convertion](https://www.npmjs.com/package/@microfocus/alm-octane-test-result-convertion)

Run the following command to install the package via NPM in your project:

```bash
$ npm i @microfocus/alm-octane-test-result-convertion
```

After installing the package, you can import the method needed for convestion as shown below.

---

### 4.2. Usage Examples

#### 4.2.1. Convert JUnit results

```typescript
import {convertJUnitXMLToOctaneXML} from '@microfocus/alm-octane-test-result-convertion';

const buildConfig = {
  build_id: '123',
  job_id: 'myJob',
  server_id: 'serverId'
};

const xml = fs
  .readFileSync(TestResources.XML_ONE_TEST_SUITE_PATH)
  .toString();

const convertedXML = convertJUnitXMLToOctaneXML(xml, buildConfig);
```

#### 4.2.2. Convert Gherkin results

```typescript
import {convertGherkinXMLToOctaneXML} from '@microfocus/alm-octane-test-result-convertion';

const buildConfig = {
  build_id: '123',
  job_id: 'myJob',
  server_id: 'serverId'
};

const xml = fs
  .readFileSync(TestResources.GHERKIN_TWO_FEATURES_PATH)
  .toString();

const convertedXML = convertGherkinXMLToOctaneXML(xml, buildConfig, 'Cucumber');
```

## 5. Change log

### 25.1.1
- Convert Gherkin test results to **the product's** format XML via the `convertGherkinXMLToOctaneXML` method.

### 25.1.0
- Fix issue causing skipped test cases to be treated as passed.

### 1.0.1
- Allows conversion from JUnit format XML to **the product's** format XML via the `convertJUnitXMLToOctaneXML` method.
