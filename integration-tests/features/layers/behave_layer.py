"""A tiny layer abstraction so ``environment.py`` stays a list of hooks.

Same shape as the reference suite's layer stack: each layer implements only the
hooks it cares about, and the stack fans every behave hook out to all layers.
"""


class BehaveLayer:
    def before_all(self, context):
        pass

    def before_feature(self, context, feature):
        pass

    def before_scenario(self, context, scenario):
        pass

    def before_step(self, context, step):
        pass

    def after_step(self, context, step):
        pass

    def after_scenario(self, context, scenario):
        pass

    def after_feature(self, context, feature):
        pass

    def after_all(self, context):
        pass


class BehaveLayerStack(BehaveLayer):
    def __init__(self, *layers):
        self.__layers = layers

    def before_all(self, context):
        for layer in self.__layers:
            layer.before_all(context)

    def before_feature(self, context, feature):
        for layer in self.__layers:
            layer.before_feature(context, feature)

    def before_scenario(self, context, scenario):
        for layer in self.__layers:
            layer.before_scenario(context, scenario)

    def before_step(self, context, step):
        for layer in self.__layers:
            layer.before_step(context, step)

    def after_step(self, context, step):
        for layer in reversed(self.__layers):
            layer.after_step(context, step)

    def after_scenario(self, context, scenario):
        for layer in reversed(self.__layers):
            layer.after_scenario(context, scenario)

    def after_feature(self, context, feature):
        for layer in reversed(self.__layers):
            layer.after_feature(context, feature)

    def after_all(self, context):
        for layer in reversed(self.__layers):
            layer.after_all(context)


class TaggedLayer(BehaveLayer):
    """Runs setup/cleanup only for scenarios carrying ``tag``."""

    def __init__(self, tag):
        self._tag = tag

    def before_scenario(self, context, scenario):
        if self._tag in scenario.effective_tags:
            self._setup(context)

    def after_scenario(self, context, scenario):
        if self._tag in scenario.effective_tags:
            self._cleanup(context, scenario)

    def _setup(self, context):
        pass

    def _cleanup(self, context, scenario):
        pass
