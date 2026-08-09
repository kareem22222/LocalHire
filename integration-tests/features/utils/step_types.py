"""Custom parse types shared by the step modules.

behave's default matcher will not bind an empty string to ``{name}``, but several
validation scenarios need to send exactly that (an empty email, a blank role).
``:Text`` accepts any run of characters that is not a quote, including nothing at
all.
"""

import parse
from behave import register_type


@parse.with_pattern(r'[^"]*')
def parse_text(text):
    return text


def register_types():
    register_type(Text=parse_text)
