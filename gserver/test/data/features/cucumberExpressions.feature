# https://github.com/cucumber/cucumber-expressions
Feature: Test Feature

   Scenario: Test Scenario for int
    When I have a 1 in my belly
    When I have a 0 in my belly
    When I have a -1 in my belly
    When I have a 9223372036854775808 in my belly
    When I have a 00000000000000000000 in my belly
    When I have a -9223372036854775809 in my belly
 
   Scenario: Test Scenario for float
    When I have a 0.0 in my belly 
    When I have a -0.0 in my belly
    When I have a .0 in my belly
    When I have a 1.0 in my belly
    When I have a -1.0 in my belly
    When I have a .1 in my belly
    When I have a 9223372036854775808.9223372036854775808 in my belly
    When I have a -9223372036854775809.9223372036854775809 in my belly
    When I have a -.9223372036854775809 in my belly
    When I have a -0.9223372036854775809 in my belly
   
   Scenario: Test Scenario for word
    When I have a important ABC in my belly
    When I have a important xyz in my belly
    When I have a important Z in my belly
    When I have a important a in my belly
    When I have a important AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA in my belly
  
   Scenario: Test Scenario for string
    When I have a "Some string" in my belly
    When I have a 'Some string' in my belly
    When I have a "" in my belly
    When I have a '' in my belly

   Scenario: Test Scenario for wildcard
    When I have a wildcard anything and or somevalue without qoutes in my belly
    When I have a wildcard  in my belly

   Scenario: Test Scenario for alternate
    When I have a cucumber in my belly
    When I have a cucumber in my stomach
  
   Scenario: Test Scenario for optional
    When I have a gherkin in my belly
    When I have a gherkins in my belly
   
   Scenario: Test Scenario for escaping
    When I have a cucumber(s) in my belly
