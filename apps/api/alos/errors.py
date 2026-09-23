class DomainError(Exception):
    def __init__(self, code: str, message: str, status: int = 422, details: dict | None = None):
        super().__init__(message)
        self.code, self.status, self.details = code, status, details or {}

    def body(self) -> dict:
        return {"error": {"code": self.code, "message": str(self), "details": self.details}}
