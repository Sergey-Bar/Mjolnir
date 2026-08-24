describe('api client', () => {
  it('returns data on success', () => {
    fetchUser(1).then((user) => {
      expect(user.name).toBe('Ada');
    });
  });
});
