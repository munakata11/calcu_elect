import sys
import json
import operator
import math
from decimal import Decimal, getcontext
from typing import Dict, Any, Union, Callable

# 高精度計算のための設定
getcontext().prec = 28

class Calculator:
    def __init__(self):
        # 基本演算子
        self.operators = {
            '+': operator.add,
            '-': operator.sub,
            '*': operator.mul,
            '/': operator.truediv,
            '**': operator.pow,
        }
        
        # 数学関数
        self.functions = {
            'sin': lambda x: math.sin(math.radians(x)),  # 度数法で計算
            'cos': lambda x: math.cos(math.radians(x)),
            'tan': lambda x: math.tan(math.radians(x)),
            'square': lambda x: x ** 2,
            'sqrt': math.sqrt,
            'circle_area': lambda r: math.pi * r ** 2,
        }
        
        # 単位変換
        self.conversions = {
            'mm_to_m': lambda x: x / 1000,
            'm_to_mm': lambda x: x * 1000,
            'mm3_to_m3': lambda x: x / 1_000_000_000,
            'm3_to_mm3': lambda x: x * 1_000_000_000,
        }

    def _safe_eval(self, expression: str) -> float:
        try:
            # 数式を分解
            tokens = self._tokenize(expression)
            # 数式を評価
            return self._evaluate_tokens(tokens)
        except Exception as e:
            raise ValueError(f"計算エラー: {str(e)}")

    def _tokenize(self, expression: str) -> list:
        # 特殊関数と演算子を処理
        expression = expression.replace('×', '*').replace('÷', '/')
        tokens = []
        current = ''
        
        i = 0
        while i < len(expression):
            char = expression[i]
            
            # 数字または小数点の処理
            if char.isdigit() or char == '.':
                current += char
            
            # 演算子の処理
            elif char in self.operators or char in '()':
                if current:
                    tokens.append(current)
                    current = ''
                tokens.append(char)
            
            # 関数名の処理
            elif char.isalpha():
                func_name = ''
                while i < len(expression) and expression[i].isalpha():
                    func_name += expression[i]
                    i += 1
                i -= 1  # ループで増加する分を調整
                
                if func_name in self.functions:
                    tokens.append(func_name)
                else:
                    raise ValueError(f"不明な関数です: {func_name}")
            
            # スペースは無視
            elif char.isspace():
                if current:
                    tokens.append(current)
                    current = ''
            
            else:
                raise ValueError(f"不正な文字です: {char}")
            
            i += 1
        
        if current:
            tokens.append(current)
        
        return tokens

    def _evaluate_tokens(self, tokens: list) -> float:
        if not tokens:
            raise ValueError("空の式は評価できません")

        # 数式を評価するスタック
        values_stack = []
        operators_stack = []
        
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            # 数値の処理
            if self._is_number(token):
                values_stack.append(Decimal(token))
            
            # 関数の処理
            elif token in self.functions:
                if i + 1 >= len(tokens):
                    raise ValueError(f"関数 {token} の引数が不足しています")
                arg = Decimal(tokens[i + 1])
                result = Decimal(str(self.functions[token](float(arg))))
                values_stack.append(result)
                i += 1
            
            # 演算子の処理
            elif token in self.operators:
                while (operators_stack and operators_stack[-1] != '(' and
                       self._precedence(operators_stack[-1]) >= self._precedence(token)):
                    self._apply_operator(values_stack, operators_stack.pop())
                operators_stack.append(token)
            
            # 括弧の処理
            elif token == '(':
                operators_stack.append(token)
            elif token == ')':
                while operators_stack and operators_stack[-1] != '(':
                    self._apply_operator(values_stack, operators_stack.pop())
                if operators_stack and operators_stack[-1] == '(':
                    operators_stack.pop()
                else:
                    raise ValueError("括弧の対応が不正です")
            
            i += 1

        # 残りの演算子を処理
        while operators_stack:
            op = operators_stack.pop()
            if op == '(':
                raise ValueError("括弧の対応が不正です")
            self._apply_operator(values_stack, op)

        if len(values_stack) != 1:
            raise ValueError("不正な式です")

        return float(values_stack[0])

    def _is_number(self, token: str) -> bool:
        try:
            Decimal(token)
            return True
        except:
            return False

    def _precedence(self, op: str) -> int:
        if op in {'+', '-'}:
            return 1
        if op in {'*', '/'}:
            return 2
        if op == '**':
            return 3
        return 0

    def _apply_operator(self, values: list, op: str) -> None:
        if len(values) < 2:
            raise ValueError("演算子の引数が不足しています")
        b = values.pop()
        a = values.pop()
        if op == '/' and b == 0:
            raise ValueError("0での除算はできません")
        values.append(Decimal(str(self.operators[op](float(a), float(b)))))

    def calculate(self, expression: str) -> Dict[str, Any]:
        try:
            result = self._safe_eval(expression)
            return {"result": str(result)}  # 文字列として返す
        except Exception as e:
            return {"error": str(e)}

    def convert_unit(self, value: float, conversion_type: str) -> Dict[str, Any]:
        try:
            if conversion_type not in self.conversions:
                raise ValueError(f"不正な変換タイプです: {conversion_type}")
            result = self.conversions[conversion_type](value)
            return {"result": str(result)}
        except Exception as e:
            return {"error": str(e)}

if __name__ == "__main__":
    calculator = Calculator()
    for line in sys.stdin:
        try:
            data = json.loads(line)
            if "expression" in data:
                result = calculator.calculate(data["expression"])
            elif "conversion" in data:
                result = calculator.convert_unit(
                    float(data["value"]),
                    data["conversion"]
                )
            else:
                result = {"error": "不正なリクエストです"}
            print(json.dumps(result))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush() 