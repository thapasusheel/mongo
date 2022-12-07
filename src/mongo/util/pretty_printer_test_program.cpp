/**
 *    Copyright (C) 2022-present MongoDB, Inc.
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the Server Side Public License, version 1,
 *    as published by MongoDB, Inc.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    Server Side Public License for more details.
 *
 *    You should have received a copy of the Server Side Public License
 *    along with this program. If not, see
 *    <http://www.mongodb.com/licensing/server-side-public-license>.
 *
 *    As a special exception, the copyright holders give permission to link the
 *    code of portions of this program with the OpenSSL library under certain
 *    conditions as described in each individual source file and distribute
 *    linked combinations including the program with the OpenSSL library. You
 *    must comply with the Server Side Public License in all respects for
 *    all of the code used other than as permitted herein. If you modify file(s)
 *    with this exception, you may extend this exception to your version of the
 *    file(s), but you are not obligated to do so. If you do not wish to do so,
 *    delete this exception statement from your version. If you delete this
 *    exception statement from all source files in the program, then also delete
 *    it in the license file.
 */

#include <iostream>
#include <memory>
#include <set>
#include <string>
#include <vector>

#include "mongo/util/debugger.h"
#include "mongo/util/decorable.h"

struct MyDecorable : mongo::Decorable<MyDecorable> {};

class testClass {
public:
    static void print_member() {
        std::cout << testClass::static_member << std::endl;
    }

private:
    static const unsigned static_member;
};
const unsigned testClass::static_member(128);

auto intVec = MyDecorable::declareDecoration<std::vector<int>>();
auto str1 = MyDecorable::declareDecoration<std::string>();
auto str2 = MyDecorable::declareDecoration<std::string>();

MyDecorable d1;
int main(int argc, char** argv) {

    std::set<int> set_type = {1, 2, 3, 4};
    std::unique_ptr<int> up(new int);
    intVec(d1) = {123, 213, 312};
    str1(d1) = "hello";
    str2(d1) = "world";
    mongo::breakpoint();

    for (auto vec : intVec(d1))
        std::cout << vec << std::endl;
    std::cout << str1(d1) << std::endl;
    std::cout << str2(d1) << std::endl;
    testClass::print_member();
    std::cout << &up << std::endl;

    return 0;
}