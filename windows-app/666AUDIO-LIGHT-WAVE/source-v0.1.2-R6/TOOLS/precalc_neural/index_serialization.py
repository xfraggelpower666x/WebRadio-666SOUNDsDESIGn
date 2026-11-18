"""Leser für bestehende Indexcaches aus reinen Python-Datentypen."""
from io import BytesIO
import pickle
import pickletools

MAX_BYTES = 64 * 1024 * 1024
DATA_OPCODES = frozenset("""
    PROTO FRAME STOP MARK POP POP_MARK DUP
    NONE NEWTRUE NEWFALSE INT BININT BININT1 BININT2 LONG LONG1 LONG4
    FLOAT BINFLOAT STRING BINSTRING SHORT_BINSTRING UNICODE
    BINUNICODE SHORT_BINUNICODE BINUNICODE8 BINBYTES SHORT_BINBYTES BINBYTES8
    EMPTY_LIST LIST APPEND APPENDS EMPTY_TUPLE TUPLE TUPLE1 TUPLE2 TUPLE3
    EMPTY_DICT DICT SETITEM SETITEMS EMPTY_SET ADDITEMS FROZENSET
    PUT BINPUT LONG_BINPUT GET BINGET LONG_BINGET MEMOIZE
""".split())


class DataOnlyUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        raise pickle.UnpicklingError("Objekte sind in Indexcaches nicht zulässig.")

    def persistent_load(self, pid):
        raise pickle.UnpicklingError("Externe Referenzen sind nicht zulässig.")


def load_indices(stream):
    data = stream.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Indexcache überschreitet das erlaubte Datenvolumen.")
    for opcode, _, _ in pickletools.genops(data):
        if opcode.name not in DATA_OPCODES:
            raise ValueError("Indexcache enthält keine reinen Daten. JSON neu erzeugen.")
    result = DataOnlyUnpickler(BytesIO(data)).load()
    if not isinstance(result, (list, tuple, dict)):
        raise ValueError("Unerwarteter Indexdatentyp.")
    return result
