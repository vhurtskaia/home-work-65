const request = require('supertest');

jest.mock('../models/Item', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

const Item = require('../models/Item');
const app = require('../app');

/** Builds a Mongoose-like chainable query mock: find().sort().lean() */
function mockFindResult(result) {
  const query = {};
  query.sort = jest.fn(() => query);
  query.lean = jest.fn(() => Promise.resolve(result));
  return query;
}

describe('GET /items (read from MongoDB)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns an empty list as JSON when the collection is empty', async () => {
    Item.find.mockReturnValue(mockFindResult([]));

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
    expect(Item.find).toHaveBeenCalledTimes(1);
  });

  test('returns the documents found in the collection as JSON', async () => {
    const fakeItems = [
      { _id: '1', title: 'First item', description: 'Hello', createdAt: '2026-01-01T00:00:00.000Z' },
      { _id: '2', title: 'Second item', description: '', createdAt: '2026-01-02T00:00:00.000Z' },
    ];
    Item.find.mockReturnValue(mockFindResult(fakeItems));

    const res = await request(app).get('/items');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({ title: 'First item', description: 'Hello' });
  });

  test('propagates a database error as a 500 response', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Item.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error('Mongo connection lost')),
    });

    const res = await request(app).get('/items');
    expect(res.status).toBe(500);

    consoleErrorSpy.mockRestore();
  });
});

describe('GET /items/page (HTML page rendered from MongoDB data)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders an HTML page listing each item title and description', async () => {
    Item.find.mockReturnValue(
      mockFindResult([{ _id: '1', title: 'My title', description: 'My description' }])
    );

    const res = await request(app).get('/items/page');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('My title');
    expect(res.text).toContain('My description');
  });

  test('escapes HTML in item fields to prevent injection', async () => {
    Item.find.mockReturnValue(
      mockFindResult([{ _id: '1', title: '<script>alert(1)</script>', description: '' }])
    );

    const res = await request(app).get('/items/page');

    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });

  test('shows a friendly message when the collection is empty', async () => {
    Item.find.mockReturnValue(mockFindResult([]));

    const res = await request(app).get('/items/page');

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/немає/i);
  });
});

describe('POST /items (protected helper to populate the collection)', () => {
  const credentials = { email: 'items.user@example.com', password: 'secret123' };
  let authedAgent;

  beforeAll(async () => {
    authedAgent = request.agent(app);
    await authedAgent.post('/auth/register').send(credentials);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/items').send({ title: 'No session' });
    expect(res.status).toBe(401);
    expect(Item.create).not.toHaveBeenCalled();
  });

  test('rejects an authenticated request without a title with 400', async () => {
    const res = await authedAgent.post('/items').send({ description: 'missing title' });
    expect(res.status).toBe(400);
    expect(Item.create).not.toHaveBeenCalled();
  });

  test('creates an item in MongoDB when the session is authenticated', async () => {
    const createdDoc = { _id: 'abc123', title: 'New item', description: 'desc' };
    Item.create.mockResolvedValue(createdDoc);

    const res = await authedAgent.post('/items').send({ title: 'New item', description: 'desc' });

    expect(res.status).toBe(201);
    expect(Item.create).toHaveBeenCalledWith({ title: 'New item', description: 'desc' });
    expect(res.body.item).toEqual(createdDoc);
  });
});
