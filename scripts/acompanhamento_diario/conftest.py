# Permite `from qualification import ...` nos testes deste diretório.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
