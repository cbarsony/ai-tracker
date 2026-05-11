const kickSample =
  "data:audio/wav;base64,UklGRsQFAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAFAABgrYDHnt+58s//4P/q/+7/6/ri6dTTwbmrnpGDdmhcT0M4LiYeFxIODAsLDRAUGiEpMjxGUV1pdYGNmaSvusPM1Nvh5uns7e3s6ubi3NXOxr20qp+Vin90amBWTEM7NC0oIx8cGhkZGh0gIyguNDtDS1RdZm95goyVnqevt77FytDU2Nvd3t/e3dvY1dDLxsC5squjm5OKgnpyamJaU01GQDs3Mi8sKikoKCgqLC4xNTk+Q0lPVVxiaXF4f4aNlJuhp62yuLzAxMfKzM7P0NDPzs3LyMXBvrm1sKuloJqUjoiCfHZwamVfWlVRTEhFQj88Ojk4Nzc3Nzg6PD5AQ0ZKTVFWWl9jaG1yd3yCh4uQlZqeoqaqrbG0trm7vb6/wMHBwcC/vr27ube0sq+sqKWhnZqWko2JhYF9eXVxbWlmYl9cWVZTUU9NS0pIR0dGRkZGR0dISUtMTlBSVFZZXF5hZGdqbnF0d3t+gYWIi46RlJeZnJ6ho6Wnqaqsra6vsLGxsbGxsbGwr6+urKuqqKelo6GfnZuYlpSRj4yKh4WCgH17eHZzcW9ta2lnZWNhYF5dXFtaWVhXV1ZWVVVVVVZWVldXWFlaW1xdXmBhYmRlZ2lqbG5wcXN1d3l7fH6AgoSFh4mKjI6PkZKUlZaXmZqbnJydnp+foKChoaGioqKioqKhoaGgoJ+fnp6dnJuamZmYl5aUk5KRkI+NjIuKiYeGhYSCgYB/fXx7enl4d3V0c3JxcXBvbm1sbGtqamlpaGhnZ2ZmZmZlZWVlZWVlZWVlZmZmZmdnZ2hoaWlpamtrbGxtbW5vb3BxcnJzdHR1dnd3eHl6e3t8fX5+f4CAgYKDg4SFhYaGh4iIiYmKiouLjIyNjY6Ojo+Pj5CQkJCRkZGRkZGSkpKSkpKSkpKSkpKSkpKRkZGRkZGQkJCQkI+Pj4+Ojo6NjY2MjIyLi4uKioqJiYmIiIeHh4aGhoWFhISEg4ODgoKCgYGAgIB/f39+fn5+fX19fHx8e3t7e3p6enp5eXl5eXh4eHh4eHd3d3d3d3Z2dnZ2dnZ2dnZ2dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXZ2dnZ2dnZ2dnZ2dnZ3d3d3d3d3d3d3d3h4eHh4eHh4eHl5eXl5eXl5enp6enp6enp6e3t7e3t7e3t8fHx8fHx8fHx9fX19fX19fX19fn5+fn5+fn5+fn9/f39/f39/f39/f3+AgICAgICAgICAgICAgICBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA=";

const pattern = [
  //       00         01         02         03
  /*00*/ ["C-300---", "--------", "--------", "--------"],
  /*01*/ ["--------", "--------", "--------", "--------"],
  /*02*/ ["--------", "--------", "--------", "--------"],
  /*03*/ ["--------", "--------", "--------", "--------"],
  /*04*/ ["--------", "--------", "--------", "--------"],
  /*05*/ ["--------", "--------", "--------", "--------"],
  /*06*/ ["--------", "--------", "--------", "--------"],
  /*07*/ ["--------", "--------", "--------", "--------"],
  /*08*/ ["--------", "--------", "--------", "--------"],
  /*09*/ ["--------", "--------", "--------", "--------"],
  /*10*/ ["--------", "--------", "--------", "--------"],
  /*11*/ ["--------", "--------", "--------", "--------"],
  /*12*/ ["--------", "--------", "--------", "--------"],
  /*13*/ ["--------", "--------", "--------", "--------"],
  /*14*/ ["--------", "--------", "--------", "--------"],
  /*15*/ ["--------", "--------", "--------", "--------"],
];

const instruments = [
  {
    name: "kick",
    sample: kickSample,
    volume: 0.9,
  },
];

export const song = {
  bpm: 120,
  rowsPerBeat: 4,
  pattern,
  instruments,
};
