import sys
import struct
from dataclasses import dataclass
from enum import Enum

# ── Schema constants ──────────────────────────────────────────────────────────
COLUMN_USERNAME_SIZE = 32
COLUMN_EMAIL_SIZE    = 255

# Compact binary layout: unsigned int (4) + 32s + 255s = 291 bytes per row
ROW_FORMAT  = f"I{COLUMN_USERNAME_SIZE}s{COLUMN_EMAIL_SIZE}s"
ROW_SIZE    = struct.calcsize(ROW_FORMAT)   # 291

PAGE_SIZE      = 4096
TABLE_MAX_PAGES = 100
ROWS_PER_PAGE  = PAGE_SIZE // ROW_SIZE
TABLE_MAX_ROWS = ROWS_PER_PAGE * TABLE_MAX_PAGES


# ── Data structures ───────────────────────────────────────────────────────────
@dataclass
class Row:
    id:       int
    username: str
    email:    str

    def __str__(self):
        return f"({self.id}, {self.username}, {self.email})"


class Table:
    def __init__(self):
        self.num_rows = 0
        self.pages: list[bytearray | None] = [None] * TABLE_MAX_PAGES

    def row_slot(self, row_num: int) -> tuple[bytearray, int]:
        """Return (page, byte_offset) for a given row number."""
        page_num   = row_num // ROWS_PER_PAGE
        if self.pages[page_num] is None:
            self.pages[page_num] = bytearray(PAGE_SIZE)
        row_offset  = row_num % ROWS_PER_PAGE
        byte_offset = row_offset * ROW_SIZE
        return self.pages[page_num], byte_offset


# ── Serialization ─────────────────────────────────────────────────────────────
def serialize_row(row: Row, page: bytearray, offset: int):
    packed = struct.pack(
        ROW_FORMAT,
        row.id,
        row.username.encode()[:COLUMN_USERNAME_SIZE],
        row.email.encode()[:COLUMN_EMAIL_SIZE],
    )
    page[offset : offset + ROW_SIZE] = packed


def deserialize_row(page: bytearray, offset: int) -> Row:
    id_, username_b, email_b = struct.unpack_from(ROW_FORMAT, page, offset)
    return Row(
        id=id_,
        username=username_b.rstrip(b"\x00").decode(),
        email=email_b.rstrip(b"\x00").decode(),
    )


# ── Enums ─────────────────────────────────────────────────────────────────────
class MetaCommandResult(Enum):
    SUCCESS      = "success"
    UNRECOGNIZED = "unrecognized"

class PrepareResult(Enum):
    SUCCESS      = "success"
    SYNTAX_ERROR = "syntax_error"
    UNRECOGNIZED = "unrecognized"

class ExecuteResult(Enum):
    SUCCESS    = "success"
    TABLE_FULL = "table_full"

class StatementType(Enum):
    INSERT = "insert"
    SELECT = "select"


# ── Statement ─────────────────────────────────────────────────────────────────
class Statement:
    def __init__(self, stmt_type: StatementType, row: Row | None = None):
        self.type           = stmt_type
        self.row_to_insert  = row   # only used for INSERT


# ── Layers ────────────────────────────────────────────────────────────────────
def do_meta_command(user_input: str) -> MetaCommandResult:
    if user_input == ".exit":
        print("Goodbye!")
        sys.exit(0)
    return MetaCommandResult.UNRECOGNIZED


def prepare_statement(user_input: str) -> tuple[PrepareResult, Statement | None]:
    if user_input.startswith("insert"):
        parts = user_input.split()
        if len(parts) < 4:
            return PrepareResult.SYNTAX_ERROR, None
        _, id_str, username, email = parts[0], parts[1], parts[2], parts[3]
        try:
            row_id = int(id_str)
        except ValueError:
            return PrepareResult.SYNTAX_ERROR, None
        row = Row(id=row_id, username=username, email=email)
        return PrepareResult.SUCCESS, Statement(StatementType.INSERT, row)

    if user_input.startswith("select"):
        return PrepareResult.SUCCESS, Statement(StatementType.SELECT)

    return PrepareResult.UNRECOGNIZED, None


def execute_insert(statement: Statement, table: Table) -> ExecuteResult:
    if table.num_rows >= TABLE_MAX_ROWS:
        return ExecuteResult.TABLE_FULL
    page, offset = table.row_slot(table.num_rows)
    serialize_row(statement.row_to_insert, page, offset)
    table.num_rows += 1
    return ExecuteResult.SUCCESS


def execute_select(statement: Statement, table: Table) -> ExecuteResult:
    for i in range(table.num_rows):
        page, offset = table.row_slot(i)
        print(deserialize_row(page, offset))
    return ExecuteResult.SUCCESS


def execute_statement(statement: Statement, table: Table) -> ExecuteResult:
    if statement.type == StatementType.INSERT:
        return execute_insert(statement, table)
    if statement.type == StatementType.SELECT:
        return execute_select(statement, table)


# ── REPL ──────────────────────────────────────────────────────────────────────
def print_prompt():
    print("db> ", end="", flush=True)

def read_input() -> str:
    try:
        return input()
    except EOFError:
        print("Error reading input")
        sys.exit(1)

def main():
    table = Table()

    while True:
        print_prompt()
        user_input = read_input().strip()

        if user_input.startswith("."):
            result = do_meta_command(user_input)
            if result == MetaCommandResult.UNRECOGNIZED:
                print(f"Unrecognized command '{user_input}'.")
            continue

        result, statement = prepare_statement(user_input)

        if result == PrepareResult.SYNTAX_ERROR:
            print("Syntax error. Could not parse statement.")
            continue
        if result == PrepareResult.UNRECOGNIZED:
            print(f"Unrecognized keyword at start of '{user_input}'.")
            continue

        exec_result = execute_statement(statement, table)
        if exec_result == ExecuteResult.SUCCESS:
            print("Executed.")
        elif exec_result == ExecuteResult.TABLE_FULL:
            print("Error: Table full.")


if __name__ == "__main__":
    main()