import sys

from enum import Enum

class MetaCommandResult(Enum):
    SUCCESS="success"
    UNRECOGNIZED="unrecognized"

class PrepareResult(Enum):
    SUCCESS="success"
    UNRECOGNIZED="unrecognized"

class StatementType(Enum):
    INSERT="insert"
    SELECT="select"

class Statement:
    def __init__(self, stmt_type):    
        self.type=stmt_type

def do_meta_command(user_input):
    if user_input==".exit":
        print("Goodbye!")
        sys.exit(1)
    else:
        return MetaCommandResult.UNRECOGNIZED
    
def prepare_statement(user_input):

    if user_input.startswith("insert"):      

        return PrepareResult.SUCCESS, Statement(StatementType.INSERT)

    if user_input.startswith("select"):          

        return PrepareResult.SUCCESS, Statement(StatementType.SELECT)

    return PrepareResult.UNRECOGNIZED, None



def execute_statement(statement):

    if statement.type == StatementType.INSERT:

        print("This is where we would do an insert.")

    elif statement.type == StatementType.SELECT:

        print("This is where we would do a select.")


def print_prompt():
    print("db>",end="",flush=True)

def read_input():
    try:
        return input()
    except EOFError:
        print("Error reading input")
        sys.exit(1)

def process_command(user_input):
    if user_input ==".exit":
        sys.exit(0)
    else:
        print(f"Unrecognized command '{user_input}'.")

def main():

    while True:

        print_prompt()

        user_input = read_input().strip()

        # Layer 1: meta commands (start with '.')

        if user_input.startswith("."):

            result = do_meta_command(user_input)

            if result == MetaCommandResult.UNRECOGNIZED:

                print(f"Unrecognized command '{user_input}'.")

            continue                          # 'continue' = go back to top of loop

        # Layer 2: SQL statements

        result, statement = prepare_statement(user_input)

        if result == PrepareResult.UNRECOGNIZED:

            print(f"Unrecognized keyword at start of '{user_input}'.")

            continue

        # Layer 3: execute

        execute_statement(statement)

        print("Executed.")
   

if __name__=="__main__":
    main()