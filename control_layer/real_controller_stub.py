class RealControllerStub:
    def __getattr__(self, name):
        raise NotImplementedError("Real control is disabled until hardware readiness gate passes in a separate branch.")
