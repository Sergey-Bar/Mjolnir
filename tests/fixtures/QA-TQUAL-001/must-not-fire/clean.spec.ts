describe('user service', () => {
  it('creates a user and verifies the result', () => {
    const repo = { save: jest.fn() };
    const user = service.createUser('Ada');
    expect(user.name).toBe('Ada');
    expect(repo.save).toHaveBeenCalled();
  });
});
