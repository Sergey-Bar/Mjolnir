describe('user service', () => {
  it('calls the repository', () => {
    const repo = { save: jest.fn() };
    service.use(repo);
    service.createUser('Ada');
    expect(repo.save).toHaveBeenCalled();
  });

  it('calls with arguments only', () => {
    const logger = jest.fn();
    service.log(logger);
    expect(logger).toHaveBeenCalledWith('started');
  });
});
