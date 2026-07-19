package com.pinova.mapper.typehandler;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

@MappedTypes(InetAddress.class)
@MappedJdbcTypes(value = JdbcType.OTHER, includeNullJdbcType = true)
public class PostgreSqlInetTypeHandler extends BaseTypeHandler<InetAddress> {

    @Override
    public void setNonNullParameter(
            PreparedStatement statement,
            int index,
            InetAddress parameter,
            JdbcType jdbcType) throws SQLException {
        statement.setObject(index, parameter.getHostAddress(), Types.OTHER);
    }

    @Override
    public InetAddress getNullableResult(ResultSet resultSet, String columnName) throws SQLException {
        return parse(resultSet.getString(columnName));
    }

    @Override
    public InetAddress getNullableResult(ResultSet resultSet, int columnIndex) throws SQLException {
        return parse(resultSet.getString(columnIndex));
    }

    @Override
    public InetAddress getNullableResult(CallableStatement statement, int columnIndex) throws SQLException {
        return parse(statement.getString(columnIndex));
    }

    private InetAddress parse(String value) throws SQLException {
        if (value == null) {
            return null;
        }
        int networkPrefix = value.indexOf('/');
        String address = networkPrefix < 0 ? value : value.substring(0, networkPrefix);
        try {
            return InetAddress.getByName(address);
        } catch (UnknownHostException exception) {
            throw new SQLException("PostgreSQL inet 地址格式无效: " + value, exception);
        }
    }
}
