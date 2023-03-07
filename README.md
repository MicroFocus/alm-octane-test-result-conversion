# alm-octane-test-result-conversion
A node library for converting different kinds of test reports into ALM Octane format.

## Usage example

```typescript
import {convertJUnitXMLToOctaneXML} from '@microfocus/alm-octane-test-result-conversion';

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

## Change log
### 1.0.0
- Allows conversion from JUnit format XML to ALM Octane format XML via the `convertJUnitXMLToOctaneXML` method.

