# Permite importar os módulos deste diretório e reusar os helpers testados do
# acompanhamento_diario (segments, qualification).
import os
import sys

_HERE = os.path.dirname(__file__)
sys.path.insert(0, _HERE)
sys.path.append(os.path.join(_HERE, "..", "acompanhamento_diario"))
