import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTeamDynamixClient } from '../src/client/index.js';
import {
  buildCustomAttributeValue,
  getCustomAttributeValue,
  buildCustomAttributeFromObject
} from '../src/client/sdk/custom-attributes.js';

const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledRequest: req => {
      throw new Error(`Unhandled request: ${req.method} ${req.url}`);
    }
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const specPath = `${process.cwd()}/tests/fixtures/openapi-test-spec.json`;

describe('Custom Attributes', () => {
  describe('Utility functions', () => {
    it('builds custom attribute value correctly', () => {
      const result = buildCustomAttributeValue(123, 'test value');
      expect(result).toEqual({ ID: 123, Value: 'test value' });

      const result2 = buildCustomAttributeValue('attribute-name', true);
      expect(result2).toEqual({ ID: 'attribute-name', Value: true });
    });

    it('builds custom attribute from object correctly', () => {
      const attribute = { ID: 456, Name: 'Test Attribute' };
      const result = buildCustomAttributeFromObject(attribute, 'value');
      expect(result).toEqual({ ID: 456, Value: 'value' });

      const attribute2 = { Name: 'Name Only' };
      const result2 = buildCustomAttributeFromObject(attribute2, 'value2');
      expect(result2).toEqual({ ID: 'Name Only', Value: 'value2' });
    });

    it('throws error when building from object without ID or Name', () => {
      expect(() => buildCustomAttributeFromObject({}, 'value')).toThrow('Custom attribute must have either ID or Name');
    });

    it('gets custom attribute value from object', () => {
      const obj = {
        Attributes: [
          { ID: 1, Name: 'Attr1', Value: 'value1' },
          { ID: 2, Name: 'Attr2', Value: 'value2' }
        ]
      };

      expect(getCustomAttributeValue(obj, 1)).toBe('value1');
      expect(getCustomAttributeValue(obj, 'Attr2')).toBe('value2');
      expect(getCustomAttributeValue(obj, 3)).toBeUndefined();
    });

    it('returns undefined when object has no Attributes', () => {
      const obj = {};
      expect(getCustomAttributeValue(obj, 1)).toBeUndefined();
    });
  });

  describe('Ticket Custom Attributes', () => {
    it('can set and get ticket custom attributes', async () => {
      server.use(
        http.get('https://api.teamdynamix.com/api/1/tickets/101', () =>
          HttpResponse.json(
            {
              ID: 101,
              Title: 'Test Ticket',
              Attributes: [
                { ID: 1, Name: 'Priority', Value: 'High' },
                { ID: 2, Name: 'Category', Value: 'Hardware' }
              ]
            },
            { status: 200 }
          )
        ),
        http.post('https://api.teamdynamix.com/api/1/tickets/101', () =>
          HttpResponse.json(
            {
              ID: 101,
              Title: 'Test Ticket',
              Attributes: [
                { ID: 1, Name: 'Priority', Value: 'Critical' },
                { ID: 2, Name: 'Category', Value: 'Software' }
              ]
            },
            { status: 200 }
          )
        )
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        specPath,
        runtimeValidationMode: 'fail-open'
      });

      // Get existing attributes
      const existingAttributes = await client.tickets.getCustomAttributes({ appId: 1, ticketId: 101 });
      expect(existingAttributes).toEqual([
        { ID: 1, Name: 'Priority', Value: 'High' },
        { ID: 2, Name: 'Category', Value: 'Hardware' }
      ]);

      // Set new attributes
      const newAttributes = [buildCustomAttributeValue(1, 'Critical'), buildCustomAttributeValue(2, 'Software')];

      const updatedTicket = await client.tickets.setTicketCustomAttributes({
        appId: 1,
        ticketId: 101,
        attributes: newAttributes
      });

      expect(updatedTicket).toEqual({
        ID: 101,
        Title: 'Test Ticket',
        Attributes: [
          { ID: 1, Name: 'Priority', Value: 'Critical' },
          { ID: 2, Name: 'Category', Value: 'Software' }
        ]
      });
    });
  });

  describe('Asset Custom Attributes', () => {
    it('can set and get asset custom attributes', async () => {
      server.use(
        http.get('https://api.teamdynamix.com/api/1/assets/201', () =>
          HttpResponse.json(
            {
              ID: 201,
              Name: 'Test Asset',
              Attributes: [
                { ID: 10, Name: 'Location', Value: 'Data Center' },
                { ID: 11, Name: 'Owner', Value: 'IT Dept' }
              ]
            },
            { status: 200 }
          )
        ),
        http.patch('https://api.teamdynamix.com/api/1/assets/201', () =>
          HttpResponse.json(
            {
              ID: 201,
              Name: 'Test Asset',
              Attributes: [
                { ID: 10, Name: 'Location', Value: 'Office' },
                { ID: 11, Name: 'Owner', Value: 'Finance' }
              ]
            },
            { status: 200 }
          )
        )
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        specPath,
        runtimeValidationMode: 'fail-open'
      });

      // Get existing attributes
      const existingAttributes = await client.assets.getCustomAttributes({ appId: 1, assetId: 201 });
      expect(existingAttributes).toEqual([
        { ID: 10, Name: 'Location', Value: 'Data Center' },
        { ID: 11, Name: 'Owner', Value: 'IT Dept' }
      ]);

      // Set new attributes
      const newAttributes = [buildCustomAttributeValue(10, 'Office'), buildCustomAttributeValue(11, 'Finance')];

      const updatedAsset = await client.assets.setAssetCustomAttributes({
        appId: 1,
        assetId: 201,
        attributes: newAttributes
      });

      expect(updatedAsset).toEqual({
        ID: 201,
        Name: 'Test Asset',
        Attributes: [
          { ID: 10, Name: 'Location', Value: 'Office' },
          { ID: 11, Name: 'Owner', Value: 'Finance' }
        ]
      });
    });
  });

  describe('Custom Attribute Registry', () => {
    it('can get ticket custom attribute definitions', async () => {
      server.use(
        http.get('https://api.teamdynamix.com/api/1/tickets/customattributes', () =>
          HttpResponse.json(
            [
              { ID: 1, Name: 'Priority', DataType: 'Text', IsRequired: false },
              { ID: 2, Name: 'Category', DataType: 'Dropdown', IsRequired: true }
            ],
            { status: 200 }
          )
        )
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        specPath,
        runtimeValidationMode: 'fail-open'
      });

      const attributes = await client.registry.getTicketCustomAttributes({ appId: 1 });
      expect(attributes).toEqual([
        { ID: 1, Name: 'Priority', DataType: 'Text', IsRequired: false },
        { ID: 2, Name: 'Category', DataType: 'Dropdown', IsRequired: true }
      ]);
    });

    it('can get asset custom attribute definitions', async () => {
      server.use(
        http.get('https://api.teamdynamix.com/api/1/assets/customattributes', () =>
          HttpResponse.json(
            [
              { ID: 10, Name: 'Location', DataType: 'Text', IsRequired: false },
              { ID: 11, Name: 'Owner', DataType: 'Person', IsRequired: true }
            ],
            { status: 200 }
          )
        )
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        specPath,
        runtimeValidationMode: 'fail-open'
      });

      const attributes = await client.registry.getAssetCustomAttributes({ appId: 1 });
      expect(attributes).toEqual([
        { ID: 10, Name: 'Location', DataType: 'Text', IsRequired: false },
        { ID: 11, Name: 'Owner', DataType: 'Person', IsRequired: true }
      ]);
    });
  });
});
