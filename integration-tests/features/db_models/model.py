"""Base class for the row models the repositories insert and read back."""

import json
from dataclasses import asdict, dataclass


@dataclass
class Model:
    def to_dict(self, skip_none=True):
        return asdict(
            self,
            dict_factory=lambda fields: {
                key: value
                for (key, value) in fields
                if value is not None or not skip_none
            },
        )

    def to_json(self):
        return json.dumps(self.to_dict(), default=str, sort_keys=True, indent=2)
